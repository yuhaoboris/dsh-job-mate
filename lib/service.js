import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { callCore } from './core.js'
import { readState } from './state-store.js'
import { expandHome } from './paths.js'
import { importResume } from './resume.js'

/** Host adapter. Profile, ledger, authorization and decisions belong to upstream. */
export class JobMateService {
  constructor({ resolveDshWorkspace = async () => null, core = callCore } = {}) {
    this.resolveDshWorkspace = resolveDshWorkspace
    this.core = core
  }
  async workspacePath() { return expandHome(process.env.JOB_MATE_HOME || (await readState()).workspacePath) }
  async request(request) { return this.core(await this.workspacePath(), request) }
  async snapshot() { return { state: await this.request({ op: 'snapshot' }) } }
  async uploadResume(input) {
    const resume = await importResume(input)
    const temp = await mkdtemp(join(tmpdir(), 'job-mate-upload-'))
    try {
      const file = join(temp, resume.name)
      await writeFile(file, Buffer.from(input.data, 'base64'), { mode: 0o600 })
      await this.request({ op: 'stage_resume', source: file, extractedText: resume.text })
      return { resume: { name: resume.name, warnings: resume.warnings }, ...(await this.snapshot()) }
    } finally { await rm(temp, { recursive: true, force: true }) }
  }
  async session({ task, threadKey, decisionId } = {}) {
    const prompts = {
      apply: '请使用 job-mate-apply 帮我筛选 BOSS 直聘职位，本轮只筛选、不发送。',
      followup: '请使用 job-mate-followup 查看已有 HR 消息，先汇总并起草，本轮不发送。',
      onboarding: '请使用 job-mate-apply 读取我提供的简历，提炼个人事实，只问缺少的求职偏好，确认后保存并开始只读筛选。',
      preferences: '请读取 job-mate 当前资料，和我对话修改求职偏好；保留未要求变更的事实和授权。',
      decision: '请读取 job-mate 待决定事项，向我说明具体问题，等待我的决定；不要代我承诺或发送。',
    }
    if (!Object.hasOwn(prompts, task)) throw Object.assign(new Error('未知任务'), { status: 400 })
    const state = (await this.snapshot()).state
    const workspace = await this.workspacePath()
    let context = ''
    if (threadKey) {
      const record = state.records.find(x => x.threadKey === threadKey)
      if (!record) throw Object.assign(new Error('会话已变化，请刷新'), { status: 409 })
      context += '\n本轮只处理这个目标：' + JSON.stringify({ account: record.account, company: record.company, title: record.title, threadKey: record.threadKey })
    }
    if (decisionId) {
      if (!state.decisions.some(x => x.id === decisionId && x.status === 'open')) throw Object.assign(new Error('事项已变化，请刷新'), { status: 409 })
      context += '\n待决定事项 ID：' + decisionId
    }
    await mkdir(workspace, { recursive: true, mode: 0o700 })
    const workspaceId = await this.resolveDshWorkspace(workspace)
    if (!workspaceId) throw new Error('宿主没有可用的会话工作区服务，请在现有会话中使用职伴技能')
    return { workspaceId, prompt: prompts[task] + '\n求职数据工作区：' + workspace + context + '\n先使用 job_mate 工具 request={"op":"snapshot"} 读取最新完整资料。上传的原件和提取文本在 resume 中；不要重复索取。' }
  }
}
