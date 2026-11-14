import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, nodes, textOf } from './support/client-harness.js'

test('first use has a resume input and no profile form', async t => {
  const ui = await mount(); t.after(() => ui.dispose())
  const tree = ui.render()
  assert.match(textOf(tree), /一份简历，就可以开始/)
  assert.equal(nodes(tree).filter(x => x.type === 'input' && x.props.type === 'file').length, 1)
  assert.equal(nodes(tree).filter(x => x.type === 'textarea').length, 0)
})

test('launch appends a draft through the documented asynchronous host API', async t => {
  const calls = []
  const ui = await mount({ uiWorkspace: { async startSession(...args) { calls.push(args) } } }); t.after(() => ui.dispose())
  const gate = ui.deferNext()
  const launch = ui.click('在对话中提供简历')
  gate.resolve({ ok: true, workspaceId: 'workspace-fixture', prompt: 'Synthetic onboarding prompt' })
  await launch; await ui.flush()
  assert.equal(calls[0][0], 'workspace-fixture')
  assert.equal(calls[0][1].whenDraftExists, 'append')
  assert.equal(calls[0][1].prompt, 'Synthetic onboarding prompt')
})

test('authentication failure hides previously loaded private data', async t => {
  const ui = await mount(); t.after(() => ui.dispose())
  ui.setResponse({ ok: false, status: 403, error: { message: 'Session expired' } })
  await ui.click('刷新'); await ui.flush()
  assert.match(textOf(ui.render()), /Session expired/)
  assert.doesNotMatch(textOf(ui.render()), /一份简历，就可以开始/)
})

test('authentication failure while opening a draft hides the previously loaded resume', async t => {
  const ui = await mount({ uiWorkspace: { startSession() { assert.fail('Host should not open a draft') } } })
  t.after(() => ui.dispose())
  ui.setResponse({ ok: true, state: { ...ui.state, resume: { name: 'synthetic-resume.txt' } } })
  await ui.click('刷新'); await ui.flush()
  assert.match(textOf(ui.render()), /synthetic-resume.txt/)
  const gate = ui.deferNext()
  const launch = ui.click('继续对话，确认求职偏好')
  gate.resolve({ ok: false, status: 403, error: { message: 'Session expired' } })
  await launch; await ui.flush()
  assert.match(textOf(ui.render()), /Session expired/)
  assert.doesNotMatch(textOf(ui.render()), /synthetic-resume.txt/)
})

test('a rejected resume keeps the chosen file and the upload action available', async t => {
  const ui = await mount(); t.after(() => ui.dispose())
  const input = nodes(ui.render()).find(node => node.type === 'input' && node.props.type === 'file')
  const file = { name: 'synthetic-resume.txt', size: 4, arrayBuffer: async () => new Uint8Array([116, 101, 115, 116]).buffer }
  input.props.onChange({ target: { files: [file] } })
  const gate = ui.deferNext()
  const upload = ui.click('读取这份简历')
  gate.resolve({ ok: false, status: 400, error: { message: '简历内容无法读取' } })
  await upload; await ui.flush()
  assert.match(textOf(ui.render()), /简历内容无法读取/)
  assert.match(textOf(ui.render()), /synthetic-resume.txt/)
  assert.equal(Boolean(ui.findButton('读取这份简历').props.disabled), false)
  ui.click('取消选择')
  assert.doesNotMatch(textOf(ui.render()), /synthetic-resume.txt|简历内容无法读取/)
})

test('a stale response cannot replace a newer snapshot', async t => {
  const ui = await mount(); t.after(() => ui.dispose())
  const gate = ui.deferNext(); const first = ui.click('刷新')
  ui.setResponse({ ok: true, state: { ...ui.state, resume: { name: 'new-resume.txt' } } })
  await ui.click('刷新'); await ui.flush()
  gate.resolve({ ok: true, state: { ...ui.state, resume: { name: 'stale-resume.txt' } } })
  await first; await ui.flush()
  assert.match(textOf(ui.render()), /new-resume.txt/)
  assert.doesNotMatch(textOf(ui.render()), /stale-resume.txt/)
})
