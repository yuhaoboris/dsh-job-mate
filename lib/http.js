import { checkConnection, authFailure } from './auth.js'
import { MAX_RESUME_BODY_BYTES } from './resume.js'

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}
async function body(req, limit = 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('请求过大'), { status: 413 })
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('请求不是有效 JSON'), { status: 400 }) }
}
export function createApiHandler({ service, getConnection, updates }) {
  return async (req, res) => {
    try {
      const auth = checkConnection(getConnection(), req.headers)
      if (!auth.available) return json(res, 403, { ok: false, error: authFailure() })
      if (auth.rejection) return json(res, auth.rejection, { ok: false, error: { message: '没有访问职伴数据的权限' } })
      const path = new URL(req.url || '/', 'http://localhost').pathname.replace(/^\/api\/job-mate/, '')
      const method = req.method || 'GET'
      if (updates && path === '/updates' && method === 'GET') return json(res, 200, { ok: true, update: await updates.check() })
      if (updates && path === '/updates/check' && method === 'POST') return json(res, 200, { ok: true, update: await updates.check(true) })
      if (updates && path === '/updates/install' && method === 'POST') return json(res, 200, { ok: true, update: await updates.install() })
      if (path === '/state' && method === 'GET') return json(res, 200, { ok: true, ...(await service.snapshot()) })
      if (path === '/resume' && method === 'POST') return json(res, 200, { ok: true, ...(await service.uploadResume(await body(req, MAX_RESUME_BODY_BYTES))) })
      if (path === '/session' && method === 'POST') return json(res, 200, { ok: true, ...(await service.session(await body(req))) })
      if (path === '/pause' && method === 'POST') {
        const input = await body(req)
        return json(res, 200, await service.request({ op: 'pause', paused: input.paused }))
      }
      return json(res, 404, { ok: false, error: { message: '未知接口或请求方法' } })
    } catch (error) {
      return json(res, error.status || 500, { ok: false, error: { code: error.code, message: error.message || '职伴服务出错' } })
    }
  }
}
