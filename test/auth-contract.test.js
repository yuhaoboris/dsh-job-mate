import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { spawnSync } from 'node:child_process'
import { createApiHandler } from '../lib/http.js'
import { registerJobMateTool } from '../lib/tool.js'

async function call(connection, service) {
  const req = Readable.from([])
  Object.assign(req, { method: 'GET', url: '/api/job-mate/state', headers: { host: 'fixture' } })
  const res = { writeHead(code) { assert.ok(Number.isInteger(code)); this.code = code }, end(text) { this.body = JSON.parse(text) } }
  await createApiHandler({ service, getConnection: () => connection })(req, res)
  return res
}
for (const [label, rejection] of [['throw', () => { throw new Error('incompatible') }],
  ['resolved Promise', () => Promise.resolve(undefined)], ['invalid object', () => ({ status: 401 })]]) {
  test(`R2 D3 ${label} disables HTTP and tools before service access`, async () => {
    let accesses = 0, tool
    const service = new Proxy({}, { get() { accesses++; return async () => ({}) } })
    const connection = { requestRejection: rejection }
    const response = await call(connection, service)
    registerJobMateTool({ tools: { register(value) { tool = value } } }, service, { getConnection: () => connection })
    const result = await tool.execute({ action: 'profile' })
    assert.equal(response.code, 403)
    assert.equal(response.body.error.code, 'AUTH_UNAVAILABLE')
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'AUTH_UNAVAILABLE')
    assert.equal(accesses, 0)
  })
}

test('R2 D3 synchronous credential rejections retain their status and recovery remains possible', async () => {
  let accesses = 0
  const service = { snapshot: async () => { accesses++; return { state: {} } } }
  for (const code of [401, 403, 500]) {
    const response = await call({ requestRejection: () => code }, service)
    assert.equal(response.code, code)
    assert.equal(response.body.error.code, undefined)
  }
  assert.equal(accesses, 0)
  assert.equal((await call({ requestRejection: () => undefined }, service)).code, 200)
  assert.equal(accesses, 1)
})

test('R2 D3 rejected Promise is consumed and cannot terminate the Node process', () => {
  const script = `
    import {createApiHandler} from ${JSON.stringify(new URL('../lib/http.js', import.meta.url).href)};
    import {registerJobMateTool} from ${JSON.stringify(new URL('../lib/tool.js', import.meta.url).href)};
    import {Readable} from 'node:stream';
    const connection={requestRejection:()=>Promise.reject(new Error('incompatible async contract'))};
    let accesses=0, tool;
    const service=new Proxy({}, {get(){ accesses++; return async()=>({}) }});
    const req=Readable.from([]); Object.assign(req,{method:'GET',url:'/api/job-mate/state',headers:{}});
    const res={writeHead(code){if(!Number.isInteger(code))throw new Error('Invalid status code');this.code=code},end(text){this.body=JSON.parse(text)}};
    await createApiHandler({service,getConnection:()=>connection})(req,res);
    registerJobMateTool({tools:{register(value){tool=value}}},service,{getConnection:()=>connection});
    const result=await tool.execute({action:'profile'});
    await new Promise(resolve=>setImmediate(resolve));
    console.log(JSON.stringify({code:res.code,http:res.body,tool:result,accesses}));
  `
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  assert.equal(child.status, 0, child.stderr)
  const result = JSON.parse(child.stdout.trim())
  assert.equal(result.code, 403)
  assert.equal(result.http.error.code, 'AUTH_UNAVAILABLE')
  assert.equal(result.tool.error.code, 'AUTH_UNAVAILABLE')
  assert.equal(result.accesses, 0)
})
