import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JobMateService } from '../lib/service.js'
import { callCore } from '../lib/core.js'
import { registerJobMateTool } from '../lib/tool.js'
import { createApiHandler } from '../lib/http.js'
import { Readable } from 'node:stream'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'job-mate-v2-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const service = new JobMateService({ resolveDshWorkspace: async p => { assert.equal(p, root); return 'fixture-id' } })
  service.workspacePath = async () => root
  return { root, service }
}
const profile = { candidateFacts: 'Synthetic resume: frontend experience', targetRoles: ['Frontend'], locations: ['Shanghai'], salary: null, requirements: [], exclusions: [], authorization: [], confirmation: 'Synthetic user confirmed' }
const target = { platform: 'boss', account: 'synthetic', company: 'Example', title: 'Frontend', threadKey: 'visible-1' }

test('upload, original skill, agent tool and panel share one database', async t => {
  const { root, service } = await fixture(t)
  const upload = await service.uploadResume({ name: 'resume.txt', data: Buffer.from('Synthetic frontend engineer').toString('base64') })
  assert.equal(upload.state.configured, false)
  assert.equal(await readFile(upload.state.resume.path, 'utf8'), 'Synthetic frontend engineer')
  await callCore(root, { op: 'configure', revision: upload.state.revision, profile })
  let tool
  registerJobMateTool({ tools: { register(x) { tool = x } } }, service, { getConnection: () => ({ requestRejection: () => null }) })
  let state = await tool.execute({ request: { op: 'snapshot' } })
  assert.equal(state.profile.candidateFacts, profile.candidateFacts)
  const run = await tool.execute({ request: { op: 'begin', revision: state.revision, skill: 'apply', account: 'synthetic', accountEvidence: 'Visible identity', noSend: true, actions: [] } })
  assert.equal(run.ok, true)
  await tool.execute({ request: { op: 'record', runId: run.result.id, target, kind: 'screen', result: 'qualified', reasons: ['Visible JD matches'] } })
  const panel = (await service.snapshot()).state
  assert.equal(panel.records.length, 1)
  assert.equal(panel.records[0].history[0].result, 'qualified')
  const denied = await tool.execute({ request: { op: 'prepare', runId: run.result.id, target, kind: 'greet', text: 'hello' } })
  assert.equal(denied.error.code, 'NO_SEND')
})

test('session preparation binds latest state and never grants sending', async t => {
  const { service } = await fixture(t)
  const session = await service.session({ task: 'onboarding' })
  assert.equal(session.workspaceId, 'fixture-id')
  assert.match(session.prompt, /只读筛选/)
  assert.equal((await service.snapshot()).state.configured, false)
  await assert.rejects(service.session({ task: 'followup', threadKey: 'missing' }), /会话已变化/)
  await assert.rejects(service.session({ task: 'decision', decisionId: 'missing' }), /事项已变化/)
})

test('missing Python produces an actionable error without data loss', async t => {
  const { root } = await fixture(t)
  await assert.rejects(callCore(root, { op: 'snapshot' }, { python: join(root, 'missing-python') }), /Python 3.9/)
})

test('existing legacy data fails without overwriting files', async t => {
  const { root, service } = await fixture(t)
  await writeFile(join(root, 'job-mate.json'), '{"schemaVersion":1}')
  await assert.rejects(service.snapshot(), error => error.code === 'LEGACY_WORKSPACE')
  assert.equal(await readFile(join(root, 'job-mate.json'), 'utf8'), '{"schemaVersion":1}')
})

test('resume endpoint requires authentication before parsing or storing', async t => {
  const { service } = await fixture(t)
  async function request(connection) {
    const req = Readable.from([Buffer.from(JSON.stringify({ name: 'resume.html', data: Buffer.from('<h1>Synthetic Engineer</h1>').toString('base64') }))])
    Object.assign(req, { method: 'POST', url: '/api/job-mate/resume', headers: {} })
    const res = { writeHead(status) { this.status = status }, end(text) { this.payload = JSON.parse(text) } }
    await createApiHandler({ service, getConnection: () => connection })(req, res)
    return res
  }
  assert.equal((await request({})).status, 403)
  assert.equal((await service.snapshot()).state.resume, null)
  const response = await request({ requestRejection: () => null })
  assert.equal(response.status, 200)
  assert.match(response.payload.state.resume.extractedText, /Synthetic Engineer/)
})
