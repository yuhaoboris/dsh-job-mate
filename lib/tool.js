import { checkConnection, authFailure } from './auth.js'

export function registerJobMateTool(ctx, service, { getConnection = () => ctx.get?.('connection') } = {}) {
  return ctx.tools.register({
    name: 'job_mate',
    description: 'job-mate 原版数据核心。先传 request={op:"snapshot"}。其他请求格式见已加载技能的 references/protocol.md；所有业务规则来自原版技能，工具不操作浏览器、不发送消息。',
    parameters: { type: 'object', properties: { request: { type: 'object', properties: { op: { type: 'string', enum: ['snapshot', 'stage_resume', 'configure', 'begin', 'pause', 'recover_run', 'answer', 'reconcile', 'end', 'record', 'decide', 'prepare', 'guard', 'finish'] } }, required: ['op'], additionalProperties: true } }, required: ['request'], additionalProperties: false },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }] },
    async execute(args) {
      if (!checkConnection(getConnection()).available) return { ok: false, error: authFailure() }
      try { return await service.request(args?.request) }
      catch (error) { return { ok: false, error: { code: error.code || 'CORE_ERROR', message: error.message } } }
    },
  })
}
