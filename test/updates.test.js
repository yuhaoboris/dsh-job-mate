import test from 'node:test'
import assert from 'node:assert/strict'
import { PluginUpdates, PACKAGE, newer } from '../lib/updates.js'
import { createApiHandler } from '../lib/http.js'
import { Readable } from 'node:stream'
import { mount, textOf } from './support/client-harness.js'

const release = { tag_name: 'v2.1.0', body: '- 新增版本更新提示\n<script>not executable</script>', published_at: '2026-11-13T00:00:00Z' }
const sha = 'a'.repeat(40)
const fixture = (overrides = {}) => {
  const calls = [], network = []
  let bundle = { name: PACKAGE, version: '2.0.0', source: 'github:yuhaoboris/dsh-job-mate', installed: true, enabled: true }
  const manager = { listBundles: async () => [bundle], installBundle: async (...args) => {
    calls.push(args); bundle = { ...bundle, version: '2.1.0' }
    return { application: 'restart-required', bundle: PACKAGE, version: '2.1.0' }
  } }
  const updates = new PluginUpdates({ version: '2.0.0', getManager: () => manager, snapshot: async () => ({ state: { run: null } }), fetcher: async (url, options) => {
    network.push({ url, options }); return Response.json(url.includes('/commits/') ? { sha } : release)
  }, ...overrides })
  return { updates, manager, calls, network, setBundle(value) { bundle = { ...bundle, ...value } } }
}

test('stable version ordering and cached release check send no job data', async () => {
  assert.equal(newer('2.10.0', '2.9.9'), true)
  for (const invalid of ['2.1.0-rc.1', 'v2.1.0', '02.1.0', '2.1']) assert.equal(newer(invalid, '2.0.0'), false)
  const f = fixture()
  const [a, b] = await Promise.all([f.updates.check(), f.updates.check()])
  assert.equal(a.phase, 'available'); assert.deepEqual(a, b)
  await f.updates.check(); assert.equal(f.network.length, 1)
  assert.equal(f.network[0].options.body, undefined)
  assert.equal(f.calls.length, 0)
  await f.updates.check(true); assert.equal(f.network.length, 2)
})

test('click installs pinned official release once with DSH expected-package verification, then detects restart across reload', async () => {
  const f = fixture(); await f.updates.check()
  const states = await Promise.all([f.updates.install(), f.updates.install()])
  assert.equal(f.calls.length, 1)
  assert.deepEqual(f.calls[0], [`github:yuhaoboris/dsh-job-mate#${sha}`, { enabled: true, saveExact: true, expected: { name: PACKAGE, version: '2.1.0' } }])
  for (const state of states) { assert.equal(state.phase, 'restart'); assert.equal(state.canInstall, false) }
  const reloaded = new PluginUpdates({ version: '2.0.0', getManager: () => f.manager })
  assert.equal((await reloaded.state()).phase, 'restart')
  const restarted = new PluginUpdates({ version: '2.1.0', getManager: () => f.manager })
  assert.equal((await restarted.state()).phase, 'idle')
})

test('active jobs, local paths, another repository, and malformed release commits cannot install', async () => {
  for (const source of ['file:/tmp/source', 'github:someone/other', 'https://github.com/yuhaoboris/dsh-job-mate.evil']) {
    const f = fixture(); f.setBundle({ source })
    assert.equal((await f.updates.check()).canInstall, false)
    await f.updates.install(); assert.equal(f.calls.length, 0)
  }
  const running = fixture({ snapshot: async () => ({ state: { run: { id: 'synthetic' } } }) })
  await running.updates.check(); assert.match((await running.updates.install()).error, /先结束/)
  assert.equal(running.calls.length, 0)
  const invalid = fixture({ fetcher: async url => Response.json(url.includes('/commits/') ? { sha: 'main' } : release) })
  await invalid.updates.check(); await invalid.updates.install(); assert.equal(invalid.calls.length, 0)
})

test('network failures, prereleases, failed installs and pending script approval never claim success', async () => {
  for (const fetcher of [async () => new Response('', { status: 429 }), async () => Response.json({ ...release, prerelease: true }), async () => { throw new DOMException('timeout', 'TimeoutError') }]) {
    const f = fixture({ fetcher }); const state = await f.updates.check()
    assert.equal(state.phase, 'check-failed'); assert.equal(state.canInstall, false)
  }
  const f = fixture(); await f.updates.check()
  f.manager.installBundle = async () => ({ application: 'failed', pendingBuilds: ['example'] })
  const state = await f.updates.install()
  assert.equal(state.phase, 'failed'); assert.match(state.error, /确认安装脚本/)
  assert.equal(state.installedVersion, '2.0.0')
  assert.equal(state.canInstall, true)
})

test('all updater endpoints require Connection authentication before reading or installing', async () => {
  for (const [path, method] of [['/updates', 'GET'], ['/updates/check', 'POST'], ['/updates/install', 'POST']]) {
    const req = Readable.from([]); Object.assign(req, { url: '/api/job-mate' + path, method, headers: {} })
    const res = { writeHead(code) { this.code = code }, end() {} }
    const updates = new Proxy({}, { get() { throw new Error('Updater called without auth') } })
    await createApiHandler({ updates, getConnection: () => ({ requestRejection: () => 401 }) })(req, res)
    assert.equal(res.code, 401)
  }
})

const available = { phase: 'available', currentVersion: '2.0.0', installedVersion: '2.0.0', available: true, canInstall: true,
  release: { version: '2.1.0', notes: release.body, url: 'https://github.com/yuhaoboris/dsh-job-mate/releases/tag/v2.1.0' } }
test('sidebar detects an update without opening workbench and releases its polling timer', async () => {
  const ui = await mount({ sidebarOnly: true, updateResponse: { ok: true, update: available } })
  assert.match(textOf(ui.render()), /有更新/)
  assert.equal(ui.requestLog.some(r => r.url.endsWith('/state')), false)
  assert.equal(ui.requestLog.some(r => r.url.endsWith('/install')), false)
  ui.dispose(); assert.equal(ui.timers.size, 0)
})
test('panel shows changelog, click installs once, restart survives state refresh, and active jobs disable update', async t => {
  const ui = await mount({ updateResponse: { ok: true, update: available } }); t.after(() => ui.dispose())
  assert.match(textOf(ui.render()), /新增版本更新提示/)
  ui.setUpdateResponse({ ok: true, update: { ...available, phase: 'restart', installedVersion: '2.1.0', canInstall: false } })
  await ui.click('更新插件'); await ui.flush()
  assert.match(textOf(ui.render()), /退出 DSH 再重新打开/)
  assert.equal(ui.requestLog.filter(r => r.url.endsWith('/updates/install')).length, 1)
  await ui.click('检查更新'); await ui.flush(); assert.match(textOf(ui.render()), /待重启/)
  const active = await mount({ updateResponse: { ok: true, update: available } }); t.after(() => active.dispose())
  active.setResponse({ ok: true, state: { ...active.state, run: { skill: 'apply' } } }); await active.click('刷新'); await active.flush()
  assert.equal(active.findButton('更新插件').props.disabled, true)
})

test('oversized public metadata fails closed and work started while resolving a tag blocks installation', async () => {
  const large = fixture({ fetcher: async () => new Response('x'.repeat(512 * 1024 + 1)) })
  assert.equal((await large.updates.check()).phase, 'check-failed')
  let snapshots = 0
  const race = fixture({ snapshot: async () => ({ state: { run: ++snapshots === 1 ? null : { id: 'new-run' } } }) })
  await race.updates.check()
  assert.match((await race.updates.install()).error, /先结束/)
  assert.equal(race.calls.length, 0)
})

test('a page opened during another tab’s installation keeps polling until completion', async t => {
  const ui = await mount({ updateResponse: { ok: true, update: { ...available, phase: 'installing', canInstall: false } } }); t.after(() => ui.dispose())
  assert.match(textOf(ui.render()), /正在更新职伴/)
  ui.setUpdateResponse({ ok: true, update: { ...available, phase: 'restart', installedVersion: '2.1.0', canInstall: false } })
  await ui.tick()
  assert.match(textOf(ui.render()), /待重启/)
})
