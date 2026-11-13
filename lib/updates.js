/** Release metadata is public; installation stays inside Harness's current profile manager. */
export const PACKAGE = '@yuhaoboris/dsh-job-mate'
export const REPOSITORY = 'yuhaoboris/dsh-job-mate'
const API = `https://api.github.com/repos/${REPOSITORY}`
const RELEASES = `https://github.com/${REPOSITORY}/releases`
const stable = value => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
export function newer(a, b) {
  if (!stable(a) || !stable(b)) return false
  const left = a.split('.').map(BigInt), right = b.split('.').map(BigInt)
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i]
  return false
}
function supportedSource(source) {
  return typeof source === 'string' && /^(?:github:yuhaoboris\/dsh-job-mate|(?:git\+)?https:\/\/github\.com\/yuhaoboris\/dsh-job-mate(?:\.git)?)(?:#[A-Za-z0-9._/-]+)?$/.test(source)
}

export class PluginUpdates {
  constructor({ version, getManager, snapshot, fetcher = fetch, now = Date.now }) {
    this.version = version
    this.getManager = getManager
    this.snapshot = snapshot
    this.fetcher = fetcher
    this.now = now
    this.release = null
    this.checkedAt = null
    this.nextCheck = 0
    this.checking = null
    this.installing = null
    this.failure = null
    this.checkError = null
    this.installedVersion = version
  }
  async request(path) {
    const response = await this.fetcher(API + path, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-job-mate-update-check' }, signal: AbortSignal.timeout(10000), redirect: 'error' })
    if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub 暂时限制请求，请稍后重试。' : `无法读取 GitHub 发布信息（HTTP ${response.status}）。`)
    const reader = response.body.getReader(), chunks = []
    let bytes = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        bytes += value.length
        if (bytes > 512 * 1024) throw new Error('发布信息过大，已停止读取。')
        chunks.push(Buffer.from(value))
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } finally { await reader.cancel().catch(() => {}) }
  }
  async bundle() {
    const manager = this.getManager()
    if (typeof manager?.listBundles !== 'function') return null
    const bundle = (await manager.listBundles()).find(item => item.name === PACKAGE && item.installed)
    if (newer(bundle?.version, this.installedVersion)) this.installedVersion = bundle.version
    return bundle ?? null
  }
  async check(force = false) {
    if (this.installing) return this.state()
    if (!this.checking && (force || this.now() >= this.nextCheck)) {
      this.checking = (async () => {
        try {
          const release = await this.request('/releases/latest')
          const version = String(release.tag_name ?? '').replace(/^v/, '')
          if (!stable(version) || release.draft || release.prerelease || !['v' + version, version].includes(release.tag_name)) throw new Error('最新发布不是可识别的稳定版本。')
          this.release = { version, tag: release.tag_name, notes: String(release.body ?? '').slice(0, 50000), publishedAt: release.published_at ?? null, url: `${RELEASES}/tag/${encodeURIComponent(release.tag_name)}` }
          this.checkedAt = new Date(this.now()).toISOString()
          this.checkError = null
          this.nextCheck = this.now() + 6 * 60 * 60 * 1000
        } catch (error) {
          this.checkError = error.name === 'TimeoutError' ? '检查更新超时，请稍后重试。' : '检查更新失败：' + error.message
          this.nextCheck = this.now() + 5 * 60 * 1000
        }
      })().finally(() => { this.checking = null })
    }
    await this.checking
    return this.state()
  }
  async state() {
    let bundle, managerError = false
    try { bundle = await this.bundle() } catch { managerError = true }
    const restart = newer(this.installedVersion, this.version)
    const available = Boolean(this.release && newer(this.release.version, this.installedVersion))
    const supported = supportedSource(bundle?.source) && typeof this.getManager()?.installBundle === 'function'
    const reason = managerError ? '暂时无法读取 DSH 插件信息，请稍后重试。' : !supported ? '当前安装来源不支持在工作台内更新。请在 DSH 插件管理中使用官方 GitHub 仓库地址安装。' : null
    return { currentVersion: this.version, installedVersion: this.installedVersion, release: this.release, checkedAt: this.checkedAt,
      phase: this.installing ? 'installing' : restart ? 'restart' : this.failure ? 'failed' : available ? 'available' : this.checkError ? 'check-failed' : this.checkedAt ? 'current' : 'idle',
      available, canInstall: available && supported && !restart && !this.checkError && !this.installing,
      reason, error: this.failure || this.checkError, releasesUrl: RELEASES }
  }
  async install() {
    if (this.installing) { await this.installing; return this.state() }
    // Set the lock before the first await so simultaneous tabs cannot install twice.
    this.installing = this.performInstall().finally(() => { this.installing = null })
    await this.installing
    return this.state()
  }
  async performInstall() {
    this.failure = null
    try {
      const bundle = await this.bundle()
      if (!supportedSource(bundle?.source) || typeof this.getManager()?.installBundle !== 'function') throw new Error('请通过 DSH 插件管理安装 GitHub 版本后再更新。')
      if (newer(this.installedVersion, this.version)) throw new Error('更新已安装，请退出并重新打开 DSH。')
      if (!this.release || this.checkError || !newer(this.release.version, this.installedVersion)) throw new Error('请先检查更新，确认可用的新版本。')
      const { state } = await this.snapshot()
      if (state.run) throw new Error('请先结束正在执行的求职任务，再更新插件。')
      const release = this.release
      const commit = await this.request(`/commits/${encodeURIComponent(release.tag)}`)
      if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('无法确认发布对应的完整提交。')
      // Resolve the tag before the final run check; a slow network must not skip newly started work.
      if ((await this.snapshot()).state.run) throw new Error('请先结束正在执行的求职任务，再更新插件。')
      const result = await this.getManager().installBundle(`github:${REPOSITORY}#${commit.sha}`, {
        enabled: bundle.enabled, saveExact: true, expected: { name: PACKAGE, version: release.version },
      })
      if (result.error || !['applied', 'restart-required'].includes(result.application)) {
        if (result.pendingBuilds?.length) throw new Error('DSH 要求确认安装脚本。请到插件管理页查看并处理，再重试更新。')
        throw new Error(result.application === 'cancelled' ? '更新已取消。' : `DSH 未完成更新${result.error?.code ? `（${result.error.code}）` : ''}，请重试或到插件管理页查看。`)
      }
      if (result.version !== release.version || result.bundle !== PACKAGE) throw new Error('DSH 未确认目标版本已安装，请到插件管理页核对。')
      this.installedVersion = result.version
    } catch (error) { this.failure = error.name === 'TimeoutError' ? '连接 GitHub 超时，请重试更新。' : error.message }
  }
}
