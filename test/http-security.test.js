import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer, request } from 'node:http'
import { Readable } from 'node:stream'
import { createApiHandler } from '../lib/http.js'

const service = { snapshot: async () => ({ state: {} }), saveSettings: async () => ({ state: {} }) }

test('F03 all methods fail closed without Connection authentication', async () => {
  for (const connection of [undefined, {}]) for (const method of ['GET', 'POST', 'DELETE']) {
    const req = Readable.from([])
    Object.assign(req, { method, url: '/api/job-mate/state', headers: { host: 'evil.example' } })
    const res = { writeHead(code) { this.code = code }, end(body) { this.body = body } }
    await createApiHandler({ service, getConnection: () => connection })(req, res)
    assert.equal(res.code, 403)
    assert.equal(JSON.parse(res.body).ok, false)
  }
})

test('F03 Connection rejection is enforced and receives request headers', async () => {
  const headers = { host: 'local', authorization: 'test-only' }
  const req = Readable.from([])
  Object.assign(req, { method: 'GET', url: '/api/job-mate/state', headers })
  const res = { writeHead(code) { this.code = code }, end() {} }
  await createApiHandler({ service, getConnection: () => ({ requestRejection(input) {
    assert.equal(input.headers, headers)
    return 401
  } }) })(req, res)
  assert.equal(res.code, 401)
})

test('F23 oversized requests receive JSON 413 over a real socket', async (t) => {
  const handler = createApiHandler({ service, getConnection: () => ({ requestRejection: () => null }) })
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const result = await new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port,
      path: '/api/job-mate/session', method: 'POST' }, res => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.end('x'.repeat(1024 * 1024 + 64))
  })
  assert.equal(result.status, 413)
  assert.equal(JSON.parse(result.body).ok, false)
})
