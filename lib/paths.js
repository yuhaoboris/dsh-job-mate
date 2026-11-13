import { homedir } from 'node:os'
import { realpathSync } from 'node:fs'
import { dirname, basename } from 'node:path'
import { isAbsolute, join, resolve, sep } from 'node:path'

/** Default job-search workspace. Users can move it from the workbench settings. */
export const DEFAULT_WORKSPACE = join(homedir(), '.job-mate')

/**
 * Plugin-private state. Kept outside the workspace so a move never carries it away.
 * `JOB_MATE_STATE_DIR` lets tests (and unusual setups) relocate it.
 * @returns {string}
 */
export function stateDir() {
  const override = process.env.JOB_MATE_STATE_DIR
  return override ? resolve(override) : join(homedir(), '.dsh-job-mate')
}

/** @returns {string} */
export function stateFile() {
  return join(stateDir(), 'state.json')
}

/**
 * Expand a leading `~` to the current home directory. Everything else is returned trimmed.
 * @param {unknown} input
 * @returns {string}
 */
export function expandHome(input) {
  if (typeof input !== 'string') return ''
  const value = input.trim()
  if (value === '~') return homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) return join(homedir(), value.slice(2))
  return value
}

/**
 * Render an absolute path with `~` for the home directory, for display only.
 * @param {string} absolute
 * @returns {string}
 */
export function displayPath(absolute) {
  if (typeof absolute !== 'string' || absolute === '') return ''
  const home = homedir()
  if (absolute === home) return '~'
  if (absolute.startsWith(home + sep)) return '~' + absolute.slice(home.length)
  return absolute
}

/** Resolve existing ancestors too, so aliases cannot hide a forbidden destination. */
export function realPath(path) {
  if (path.includes('\0')) throw new Error('路径不能包含 NUL')
  const absolute = resolve(expandHome(path))
  try { return realpathSync(absolute) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = dirname(absolute)
    if (parent === absolute) throw error
    return join(realPath(parent), basename(absolute))
  }
}

/**
 * Validate a workspace directory before anything is written.
 * @param {unknown} input
 * @returns {string | undefined} a user-facing problem, or undefined when acceptable
 */
export function workspacePathProblem(input) {
  const value = expandHome(input)
  if (value.includes('\0')) return '工作区目录不能包含空字节（NUL）'
  if (value === '') return '请填写工作区目录'
  if (!isAbsolute(value)) return '请填写绝对路径，例如 ~/.job-mate'

  const normalized = realPath(value)
  const home = realPath(homedir())
  if (normalized === home) return '不能在用户主目录根部建立求职工作区'
  if (normalized === resolve(normalized, sep)) return '不能用文件系统根目录作为求职工作区'
  const state = realPath(stateDir())
  if (normalized === state || normalized.startsWith(state + sep)) {
    return '不能使用职伴插件的状态目录'
  }
  return undefined
}
