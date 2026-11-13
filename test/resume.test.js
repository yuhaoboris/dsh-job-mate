import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { importResume, MAX_RESUME_BYTES } from '../lib/resume.js'
import { createApiHandler } from '../lib/http.js'
import { pdfFixture, docxFixture } from './support/resume-fixtures.js'

const upload = (name, bytes) => ({ name, data: Buffer.from(bytes).toString('base64') })

test('resume extracts UTF-8 text/Markdown, Chinese DOCX and real PDF bytes', async () => {
  for (const name of ['resume.txt', 'resume.MD']) {
    assert.equal((await importResume(upload(name, '\ufeff姓名：示例\r\n技能：Vue'))).text, '姓名：示例\n技能：Vue')
  }
  assert.equal((await importResume(upload('resume.docx', docxFixture()))).text, '示例工程师：Vue 与 PHP')
  const pdf = await importResume(upload('resume.pdf', pdfFixture()))
  assert.equal(pdf.text, 'Synthetic Engineer')
  assert.ok(pdf.warnings.length)
})

test('resume rejects malformed, oversized, unsupported, empty and unreadable uploads', async () => {
  for (const input of [
    null, { name: '../a.txt', data: 'YQ==' }, upload('resume.doc', 'old doc'),
    { name: 'resume.txt', data: '!!!!' }, { name: 'resume.txt', data: 'YR==' },
    upload('resume.pdf', 'not a pdf'), upload('resume.docx', 'not a zip'),
    upload('resume.txt', ' '.repeat(10)), upload('resume.txt', Buffer.from([0xff])),
    upload('resume.txt', Buffer.alloc(MAX_RESUME_BYTES + 1, 65)),
    upload('resume.txt', 'a'.repeat(100001)), upload('resume.docx', Buffer.from([0x50, 0x4b, 3, 4])),
  ]) await assert.rejects(importResume(input), error => [400, 413, 422].includes(error.status))
})

test('PDF with no text or too many pages fails instead of returning partial facts', async () => {
  await assert.rejects(importResume(upload('scan.pdf', pdfFixture(''))), /未提取到文字/)
  await assert.rejects(importResume(upload('long.pdf', pdfFixture('Engineer', 31))), /超过 30 页/)
})

test('HTML is text only, drops scripts and preserves readable content', async () => {
  const result = await importResume(upload('resume.html', '<html><script>fetch("https://example.invalid")</script><body><h1>Synthetic Engineer</h1><p>Vue &amp; Python</p></body></html>'))
  assert.match(result.text, /Synthetic Engineer/)
  assert.match(result.text, /Vue & Python/)
  assert.doesNotMatch(result.text, /fetch/)
})
