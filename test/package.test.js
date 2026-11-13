import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parseSkillDocument, apply } from '../index.js'

test('plugin registers complete original upstream skills and the canonical data tool', async () => {
  const registered = [], tools = []
  const ctx = { get: name => name === 'connection' ? { requestRejection: () => null } : null,
    effect(fn) { fn() }, skills: { register(x) { registered.push(x) } },
    tools: { register(x) { tools.push(x) } }, webServer: { register() {} } }
  apply(ctx)
  assert.deepEqual(registered.map(x => x.name), ['job-mate-apply', 'job-mate-followup'])
  for (const skill of registered) {
    const original = parseSkillDocument(await readFile(skill.path, 'utf8'))
    assert.equal(skill.content, original.body)
    assert.match(skill.content, /references\/onboarding.md/)
  }
  assert.equal(tools[0].name, 'job_mate')
})

test('every pinned upstream resource matches its SHA-256', async () => {
  const lock = JSON.parse(await readFile(new URL('../upstream-lock.json', import.meta.url)))
  for (const [file, expected] of Object.entries(lock.files)) {
    const bytes = await readFile(new URL('../' + file, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, file)
  }
})
