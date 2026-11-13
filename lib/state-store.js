import { mkdir, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'
import { serialize, writeAtomic } from './commit.js'
import { DEFAULT_WORKSPACE, stateDir, stateFile } from './paths.js'

/**
 * @typedef {object} PluginState
 * @property {number} version
 * @property {string} workspacePath absolute path of the active job-search workspace
 * @property {string | null} updatedAt ISO timestamp of the last write
 */

/** @returns {Promise<PluginState>} the persisted state, or the default workspace */
export async function readState() {
  try {
    const raw = await readFile(stateFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.workspacePath === 'string' && isAbsolute(parsed.workspacePath) && !parsed.workspacePath.includes('\0')) {
      return {
        version: 1,
        revision: typeof parsed.revision === 'string' ? parsed.revision : 'legacy',
        workspacePath: parsed.workspacePath,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      }
    }
    throw new SyntaxError('无效的 workspacePath')
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw Object.assign(new Error(`工作区指针需要显式恢复：${error.message}。请保留 ${stateFile()} 并人工修复，未切换到默认目录。`), { status: 409 })
    }
  }
  return { version: 1, workspacePath: DEFAULT_WORKSPACE, updatedAt: null }
}

/**
 * Atomically persist the pointer so a crash never leaves a half-written state file.
 * @param {PluginState} state
 * @returns {Promise<PluginState>}
 */
export async function writeState(state) {
  return serialize(`pointer:${stateFile()}`, async () => {
  const next = {
    revision: randomUUID(),
    version: 1,
    workspacePath: state.workspacePath,
    updatedAt: new Date().toISOString(),
  }
  await mkdir(stateDir(), { recursive: true })
  const target = stateFile()
  await writeAtomic(target, `${JSON.stringify(next, null, 2)}\n`)
  return next
  })
}
