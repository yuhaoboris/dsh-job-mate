import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createApiHandler } from './lib/http.js'
import { JobMateService } from './lib/service.js'
import { registerJobMateTool } from './lib/tool.js'
import { authAvailable } from './lib/auth.js'
import { PluginUpdates } from './lib/updates.js'

const PLUGIN_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export const name = 'job-mate'

/** The workbench needs the web carrier, the shared auth layer, tools, and the skill catalog. */
export const inject = ['webServer', 'connection', 'tools', 'skills']

const SKILL_MODULES = ['job-mate-apply', 'job-mate-followup']

/**
 * Split a SKILL.md into its frontmatter and body. Descriptions are single-line on purpose:
 * the same file is both a readable document and the registration source.
 * @param {string} text
 * @returns {{meta: Record<string, string>, body: string}}
 */
export function parseSkillDocument(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { meta: {}, body: text.trim() }

  /** @type {Record<string, string>} */
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line)
    if (!entry) continue
    meta[entry[1]] = entry[2].trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: text.slice(match[0].length).trim() }
}

function loadSkillModule(moduleName) {
  const url = new URL(`./skills/${moduleName}/SKILL.md`, import.meta.url)
  const raw = readFileSync(fileURLToPath(url), 'utf8')
  const { meta, body } = parseSkillDocument(raw)
  return {
    name: meta.name || moduleName,
    description: meta.description || '',
    whenToUse: meta.whenToUse,
    content: body,
    source: 'bundled',
    path: fileURLToPath(url),
  }
}

function registerSkills(ctx) {
  for (const moduleName of SKILL_MODULES) {
    let skill
    try {
      skill = loadSkillModule(moduleName)
    } catch (error) {
      // A missing skill must not take down the panel: the workbench itself still works.
      console.warn(`[job-mate] 技能 ${moduleName} 读取失败：${error?.message ?? error}`)
      continue
    }
    if (!skill.description) {
      console.warn(`[job-mate] 技能 ${moduleName} 缺少 description，已跳过注册`)
      continue
    }
    ctx.effect(() =>
      ctx.skills.register({
        name: skill.name,
        description: skill.description,
        whenToUse: skill.whenToUse,
        content: skill.content,
        source: skill.source,
        path: skill.path,
        invocation: { modelInvocable: true, userInvocable: true },
      }),
    )
  }
}

/**
 * Host half of the 职伴 bundle.
 *
 * Owns the Harness adapter surfaces:
 * 1. 职伴’s own job-search workspace on disk (shared with the original upstream skills),
 * 2. one authenticated HTTP surface for the panel,
 * 3. one agent tool plus two skills that operate the same workspace,
 * 4. public release metadata and user-triggered installation through Harness.
 */
export function apply(ctx) {
  let warned = false
  const getConnection = () => {
    const connection = ctx.get('connection')
    if (!authAvailable(connection)) {
      if (!warned) console.warn(`[job-mate] AUTH_UNAVAILABLE dependency=${connection ? 'Connection.requestRejection' : 'Connection'} plugin=${PLUGIN_VERSION} node=${process.versions.node} harness=unknown (version not exposed)`)
      warned = true
    } else warned = false
    return connection
  }
  getConnection()
  const service = new JobMateService({
    resolveDshWorkspace: async (path) => {
      const registry = ctx.get('workspaceRegistry')
      if (!registry) throw new Error('宿主缺少 workspaceRegistry 服务')
      const existing = await registry.resolveByPath(path)
      if (existing) return String(existing.id)
      const created = await registry.create(path)
      return String(created.id)
    },
  })

  const updates = new PluginUpdates({ version: PLUGIN_VERSION, getManager: () => ctx.get('pluginManager'), snapshot: () => service.snapshot() })
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: '/api/job-mate',
      handler: createApiHandler({
        service,
        getConnection,
        updates,
      }),
    }),
  )

  ctx.effect(() => registerJobMateTool(ctx, service, { getConnection }))
  registerSkills(ctx)
}
