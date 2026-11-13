import { parentPort, workerData } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { sep } from 'node:path'

const { bytes, format, maxChars } = workerData
const warnings = []
const checkLength = text => {
  if (text.length > maxChars) throw new Error('提取内容超过 10 万字，请精简简历后重试；本次未导入')
  return text
}

async function extract() {
  if (format === 'html' || format === 'htm') {
    const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    // Parse text only: never execute scripts, load resources, or render uploaded HTML.
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => { const cp = Number(n); return cp <= 0x10ffff ? String.fromCodePoint(cp) : '' })
  }
  if (format === 'txt' || format === 'md') {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
    catch { throw new Error('文本文件需要 UTF-8 编码，请转换后重新上传') }
  }
  if (format === 'docx') {
    const { default: mammoth } = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) }, { externalFileAccess: false })
    if (result.messages.length) warnings.push('文档存在未完整识别的内容，请对照原简历核对。')
    return result.value
  }
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const root = new URL('./', import.meta.resolve('pdfjs-dist/package.json'))
  // PDF.js requires a trailing forward slash, including for local Windows paths.
  const resourcePath = name => fileURLToPath(new URL(name, root)).split(sep).join('/')
  const task = getDocument({
    data: new Uint8Array(bytes),
    cMapUrl: resourcePath('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: resourcePath('standard_fonts/'),
    useWorkerFetch: false,
    isEvalSupported: false,
    stopAtErrors: true,
    verbosity: 0,
  })
  try {
    const pdf = await task.promise
    if (pdf.numPages > 30) throw new Error('PDF 超过 30 页，请只保留简历相关页面')
    let text = ''
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      const pageText = content.items.filter(item => typeof item.str === 'string')
        .map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('')
      if (!pageText.trim()) throw new Error(`PDF 第 ${number} 页未提取到文字，可能是扫描页；请提供可复制文字的 PDF 或 DOCX`)
      text = checkLength(text + pageText + '\n\n')
      page.cleanup()
    }
    warnings.push('PDF 的分栏、表格和图片文字可能提取不完整，请对照原简历核对顺序与内容。')
    return text
  } finally {
    await task.destroy()
  }
}

try {
  const text = checkLength((await extract()).replace(/\r\n?/g, '\n').trim())
  if (!text || !/[\p{L}\p{N}]/u.test(text)) throw new Error('没有提取到有效文字，请提供可复制文字的简历')
  if (/[\x00-\x08\x0e-\x1f\ufffd]/.test(text)) throw new Error('提取内容包含乱码，请重新导出简历后再试')
  parentPort.postMessage({ text, warnings })
} catch (error) {
  // Parser exceptions can contain document content or paths. Expose only our own messages.
  const own = /^(提取内容|文本文件|PDF 超过|PDF 第|没有提取)/.test(error.message)
  parentPort.postMessage({ error: error.name === 'PasswordException'
    ? '这份 PDF 需要密码，请提供已解除密码的简历'
    : own ? error.message : '无法解析这份简历，请重新导出为 PDF 或 DOCX 后再试' })
}
