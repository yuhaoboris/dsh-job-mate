import { Worker } from 'node:worker_threads'

export const MAX_RESUME_BYTES = 5 * 1024 * 1024
export const MAX_RESUME_BODY_BYTES = Math.ceil(MAX_RESUME_BYTES / 3) * 4 + 4096
const MAX_TEXT_CHARS = 100000
let active = 0
const fail = (message, status = 400) => Object.assign(new Error(message), { status })

/** Extract a preview only. No file paths, workspace writes, model calls or retained uploads. */
export async function importResume(input) {
  const { name, data } = input ?? {}
  if (typeof name !== 'string' || name.length > 255 || /[\\/\x00-\x1f]/.test(name)) {
    throw fail('请选择一份简历文件')
  }
  const format = /\.([^.]+)$/.exec(name)?.[1].toLowerCase()
  if (!['pdf', 'docx', 'html', 'htm', 'txt', 'md'].includes(format)) throw fail('支持 PDF、DOCX、HTML、TXT 和 Markdown；请将旧版 DOC 转为 DOCX 或 PDF')
  if (typeof data !== 'string' || !data.length || data.length > Math.ceil(MAX_RESUME_BYTES / 3) * 4) {
    throw fail('简历不能为空，且不能超过 5 MB', 413)
  }
  if (data.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw fail('文件数据不完整，请重新选择文件')
  const bytes = Buffer.from(data, 'base64')
  if (bytes.toString('base64') !== data) throw fail('文件数据不完整，请重新选择文件')
  if (!bytes.length || bytes.length > MAX_RESUME_BYTES) throw fail('简历不能为空，且不能超过 5 MB', 413)
  if (format === 'pdf' && !bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw fail('文件内容不是有效的 PDF')
  if (format === 'docx' && !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 3, 4]))) throw fail('文件内容不是有效的 DOCX')
  if (active >= 2) throw fail('正在解析其他简历，请稍后重试', 429)

  active++
  let worker, timer
  try {
    // Parser CPU work cannot block the Host event loop; timeout terminates the worker.
    worker = new Worker(new URL('./resume-worker.js', import.meta.url), {
      workerData: { bytes, format, maxChars: MAX_TEXT_CHARS },
      resourceLimits: { maxOldGenerationSizeMb: 256 },
      execArgv: [],
    })
    const result = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(fail('简历解析超时，请精简文件后重试', 422)), 20000)
      worker.once('message', result => result.error ? reject(fail(result.error, 422)) : resolve(result))
      worker.once('error', () => reject(fail('无法解析这份简历，请重新导出为 PDF 或 DOCX 后再试', 422)))
      worker.once('exit', () => reject(fail('简历解析未完成，请换一份文件重试', 422)))
    })
    return { name, text: result.text, warnings: result.warnings }
  } finally {
    clearTimeout(timer)
    if (worker) await worker.terminate()
    active--
  }
}
