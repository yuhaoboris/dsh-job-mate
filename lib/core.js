import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../skills/job-mate-apply/scripts/job_mate.py', import.meta.url))

/** JSON stdin, no shell, no second implementation of job-mate business rules. */
export function callCore(workspace, request, { python = process.env.JOB_MATE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3') } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script, '--workspace', workspace], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    let stdout = '', overflow = false
    const timer = setTimeout(() => { child.kill(); reject(Object.assign(new Error('工作区操作超时，请先刷新核对实际结果'), { code: 'CORE_TIMEOUT' })) }, 30000)
    child.stdout.on('data', data => {
      stdout += data
      if (Buffer.byteLength(stdout) > 32 * 1024 * 1024) { overflow = true; child.kill() }
    })
    child.stderr.on('data', () => {}) // Do not echo potentially private parser details.
    child.stdin.on('error', () => {})
    child.on('error', error => {
      clearTimeout(timer)
      reject(Object.assign(new Error(error.code === 'ENOENT' ? '未找到 Python 3.9+。请让 Agent 安装 Python 后继续，已有资料会保留。' : '无法启动 job-mate 数据核心'), { code: 'CORE_UNAVAILABLE' }))
    })
    child.on('close', () => {
      clearTimeout(timer)
      if (overflow) return reject(new Error('工作区快照过大，请先备份并由 Agent 检查'))
      try {
        const result = JSON.parse(stdout)
        if (!result.ok) return reject(Object.assign(new Error(result.error.message), { code: result.error.code, status: 409 }))
        resolve(result)
      } catch { reject(new Error('job-mate 返回无效响应，请先刷新核对实际结果')) }
    })
    child.stdin.end(JSON.stringify(request))
  })
}
