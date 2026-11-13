/* global window */
window.__ModuleLoader__.load({
  id: '@yuhaoboris/dsh-job-mate',
  factory(require) {
    const React = require('react')
    const { useState, useEffect, useRef, useCallback, useMemo } = React
    const h = React.createElement
    const LABELS = { qualified: '待沟通', pending: '待核实', excluded: '已排除', waiting: '等待回复', replied: '收到回复', interview: '面试邀约', closed: '已结束', uncertain: '发送待核对', failed_no_send: '确定未发' }
    const KINDS = { screen: '筛选职位', greet: '首次沟通', reply: '回复', nudge: '跟进', resume: '发送简历', inbound: '对方消息摘要', observe: '会话观察' }
    const STYLE = `
    .jm { height:100%;overflow:auto;background:var(--dsw-alias-bg-base,#fafaf8);color:var(--dsw-alias-label-primary,#202522);font:14px/1.65 system-ui,sans-serif;overflow-wrap:anywhere }
    .jm * { box-sizing:border-box }.jm-shell { max-width:1180px;margin:auto;padding:32px 36px 64px }.jm h1{font-size:28px;letter-spacing:-.7px;margin:0}.jm h2{font-size:17px;margin:0 0 12px}.jm h3{font-size:15px;margin:0}.jm p{margin:8px 0}.jm small,.jm-muted{color:var(--dsw-alias-label-secondary,#606b64)}
    .jm-head,.jm-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.jm-head{justify-content:space-between;margin-bottom:24px}.jm-button{min-height:42px;border:1px solid var(--dsw-alias-border-l2,#b9c2bb);border-radius:9px;padding:8px 14px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit;cursor:pointer}.jm-button:hover{border-color:var(--dsw-alias-label-secondary,#59645e)}.jm-primary{background:#275943;color:#fff;border-color:#275943}.jm button:disabled{opacity:.5;cursor:wait}.jm button:focus-visible,.jm input:focus-visible,.jm select:focus-visible,.jm summary:focus-visible{outline:3px solid var(--dsw-alias-brand-primary,#4e8267);outline-offset:3px}
    .jm-card{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#dde2db);border-radius:14px;padding:22px;min-width:0}.jm-hero{max-width:760px;margin:48px auto;padding:38px}.jm-hero h2{font-size:26px;line-height:1.4;margin:12px 0}.jm-eyebrow{font-size:12px;font-weight:650;letter-spacing:1px;color:var(--dsw-alias-label-secondary,#606b64)}.jm-upload{display:block;margin:28px 0 18px;border:1px dashed var(--dsw-alias-label-secondary,#7f8c81);padding:26px;border-radius:10px}.jm-upload input{display:block;max-width:100%;margin-top:16px;font:inherit}.jm-steps{display:flex;gap:22px;flex-wrap:wrap;margin-top:26px;color:var(--dsw-alias-label-secondary,#606b64)}.jm-steps span{white-space:nowrap}.jm-alert{padding:14px 18px;border:1px solid #b18b44;background:var(--dsw-alias-bg-layer-1,#fffcf3);border-radius:10px;margin:16px 0}.jm-alert p{margin:0}.jm-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}.jm-metric strong{display:block;font-size:30px;line-height:1.4}.jm-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,1fr);gap:20px;align-items:start}.jm-stack{display:grid;gap:18px}.jm-tools{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}.jm input[type=search],.jm select{min-height:42px;max-width:100%;border:1px solid var(--dsw-alias-border-l2,#b9c2bb);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit}.jm input[type=search]{flex:1;min-width:160px}.jm-list{list-style:none;padding:0;margin:0}.jm-record{display:flex;width:100%;gap:12px;align-items:center;justify-content:space-between;text-align:left;background:transparent;color:inherit;border:0;border-top:1px solid var(--dsw-alias-border-l2,#e1e5df);padding:16px 0;font:inherit;cursor:pointer}.jm-record strong,.jm-record small{display:block}.jm-record[aria-pressed=true]{color:var(--dsw-alias-brand-primary,#275943)}.jm-badge{font-size:12px;padding:3px 9px;border-radius:6px;background:var(--dsw-alias-bg-layer-2,#edf1ec);white-space:nowrap}.jm-empty{padding:32px 8px;color:var(--dsw-alias-label-secondary,#606b64)}.jm-decision{border-top:1px solid var(--dsw-alias-border-l2,#e1e5df);padding:14px 0}.jm-decision:first-of-type{border:0}.jm-timeline{margin:0;padding-left:22px}.jm-timeline li{padding:0 0 20px 8px}.jm-text{white-space:pre-wrap;padding:12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f1f3ee);max-height:320px;overflow:auto}.jm-footer{margin-top:24px;font-size:12px}.jm-sr{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:850px){.jm-grid{grid-template-columns:1fr}.jm-shell{padding:24px 20px}.jm-hero{margin:20px auto;padding:26px}.jm-metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.jm-shell{padding:20px 14px}.jm-hero{padding:20px}.jm-record{align-items:flex-start}.jm-badge{white-space:normal}.jm-head{align-items:flex-start}}
    `
    async function api(path, data) {
      const response = await fetch('/api/job-mate' + path, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: data === undefined ? {} : { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw Object.assign(new Error(result.error?.message || '读取失败，请重试'), { status: response.status })
      return result
    }
    function date(value) { if (!value) return '时间未知'; const d = new Date(value); return Number.isNaN(d.valueOf()) ? '时间未知' : d.toLocaleString() }
    function Icon() { return h('svg', { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true }, h('rect', { x: 3, y: 7, width: 18, height: 14, rx: 3 }), h('path', { d: 'M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18M10 12v3h4v-3' })) }
    function Button({ children, primary, ...props }) { return h('button', { type: 'button', ...props, className: 'jm-button' + (primary ? ' jm-primary' : '') }, children) }
    function Workbench({ ctx }) {
      const [state, setState] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState(''), [query, setQuery] = useState(''), [filter, setFilter] = useState('')
      const [selected, setSelected] = useState(null), [file, setFile] = useState(null)
      const alive = useRef(true), generation = useRef(0), working = useRef(false)
      const refresh = useCallback(async () => {
        const gen = ++generation.current
        try {
          const value = await api('/state')
          if (alive.current && gen === generation.current) { setState(value.state); setError('') }
        } catch (e) {
          if (alive.current && gen === generation.current) { setError(e.message); if (e.status === 401 || e.status === 403) setState(null) }
        }
      }, [])
      useEffect(() => {
        alive.current = true
        refresh()
        const timer = setInterval(() => { if (!working.current) refresh() }, 10000)
        return () => { alive.current = false; generation.current++; clearInterval(timer) }
      }, [refresh])
      async function perform(action) {
        if (working.current) return
        working.current = true; generation.current++; setBusy(true); setNotice('')
        try { await action(); if (alive.current) await refresh() }
        catch (e) { if (alive.current) setError(e.message) }
        finally { working.current = false; if (alive.current) setBusy(false) }
      }
      function launch(task, extra = {}) {
        return perform(async () => {
          if (!ctx.uiWorkspace?.startSession) throw new Error('当前宿主不支持会话入口，请在会话里调用职伴技能')
          const session = await api('/session', { task, ...extra })
          await ctx.uiWorkspace.startSession(session.workspaceId, { prompt: session.prompt, whenDraftExists: 'append' })
        })
      }
      function upload() {
        if (!file) return
        return perform(async () => {
          if (file.size > 5 * 1024 * 1024) throw new Error('简历不能超过 5 MB')
          const bytes = new Uint8Array(await file.arrayBuffer())
          let binary = ''
          for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
          const result = await api('/resume', { name: file.name, data: btoa(binary) })
          if (alive.current) { setState(result.state); setFile(null); setNotice(['简历已保存。继续对话，由 Agent 整理事实并询问偏好。', ...result.resume.warnings].join(' ')) }
        })
      }
      const records = useMemo(() => (state?.records || []).filter(r => (!filter || r.status === filter) && (!query || (r.company + ' ' + r.title).toLowerCase().includes(query.toLowerCase()))), [state, query, filter])
      const record = state?.records?.find(r => JSON.stringify([r.account, r.threadKey]) === selected)
      const blocked = busy || Boolean(error)
      const intro = !state?.configured || state?.resumeNeedsReview
      return h('main', { className: 'jm', 'aria-busy': busy }, h('style', null, STYLE), h('div', { className: 'jm-shell' },
        h('header', { className: 'jm-head' }, h('div', null, h('div', { className: 'jm-eyebrow' }, 'JOB MATE · 职伴'), h('h1', null, '你的求职进展')), h('div', { className: 'jm-row' }, state?.configured && h(Button, { disabled: blocked, onClick: () => launch('preferences') }, '调整求职偏好'), h(Button, { disabled: busy, onClick: refresh }, '刷新'))),
        error && h('div', { className: 'jm-alert', role: 'alert' }, h('p', null, error), state && h('small', null, '以下为上次完整快照，恢复读取前不能发起任务。')),
        notice && h('p', { role: 'status', className: 'jm-alert' }, notice),
        !state && !error && h('p', { role: 'status' }, '正在读取求职进展…'),
        state && intro && h('section', { className: 'jm-card jm-hero' }, h('div', { className: 'jm-eyebrow' }, '从你的经历开始'), h('h2', null, state.resume ? '简历已就绪，接下来聊聊你想找的工作' : '一份简历，就可以开始'), h('p', { className: 'jm-muted' }, 'Agent 会读取你的经历，再问几个求职偏好。资料确认后，就能筛选职位、整理 HR 消息。'),
          state.resume && h('p', null, '当前简历：', h('strong', null, state.resume.name)),
          h('label', { className: 'jm-upload' }, state.resume ? '更换简历' : '选择一份简历文档', h('small', null, ' · PDF / DOCX / HTML / TXT / Markdown，最大 5 MB'), h('input', { type: 'file', accept: '.pdf,.docx,.html,.htm,.txt,.md', disabled: busy || Boolean(state.run), onChange: e => setFile(e.target.files?.[0] || null) })),
          h('div', { className: 'jm-row' }, file && h(Button, { primary: true, disabled: busy, onClick: upload }, busy ? '正在读取…' : '读取这份简历'), !file && h(Button, { primary: true, disabled: blocked, onClick: () => launch('onboarding') }, state.resume ? '继续对话，确认求职偏好' : '在对话中提供简历')),
          h('div', { className: 'jm-steps' }, h('span', null, '01 提供简历'), h('span', null, '02 确认偏好'), h('span', null, '03 开始求职')),
          h('p', { className: 'jm-footer jm-muted' }, '简历保存在本机工作区；Agent 分析时可能交给你所用的模型服务。开始按钮打开待发送的会话草稿。')),
        state?.paused && h('div', { className: 'jm-alert', role: 'status' }, h('strong', null, '求职任务已暂停'), h('p', null, 'Agent 的下一次发送前检查会停止外发。'), h(Button, { disabled: blocked, onClick: () => perform(() => api('/pause', { paused: false })) }, '解除暂停')),
        state?.run && h('div', { className: 'jm-alert', role: 'status' }, h('strong', null, '任务正在执行'), h('p', null, `${state.run.skill === 'apply' ? '筛选职位' : '处理消息'} · ${state.run.noSend ? '只读模式' : '按本轮授权执行'}`), h(Button, { disabled: blocked || state.paused, onClick: () => perform(() => api('/pause', { paused: true })) }, '暂停后续操作')),
        state?.configured && h(React.Fragment, null,
          h('section', { className: 'jm-card jm-head' }, h('div', null, h('h2', null, state.profile.targetRoles.join(' / ')), h('p', { className: 'jm-muted' }, state.profile.locations.join(' · '), ' · ', state.profile.salary ? `${state.profile.salary.min}–${state.profile.salary.max} ${state.profile.salary.currency}/${state.profile.salary.period === 'month' ? '月' : '年'}` : '薪资不设筛选门槛')), h('div', { className: 'jm-row' }, h(Button, { primary: true, disabled: blocked || !!state.run || state.paused || intro, onClick: () => launch('apply') }, '筛选职位'), h(Button, { disabled: blocked || !!state.run || state.paused, onClick: () => launch('followup') }, '查看 HR 消息'))),
          h('p', { className: 'jm-muted' }, '任务会先在会话中准备，发送消息前按你的授权执行。以下统计来自 Agent 记录，并非平台实时同步。')),
        state && (state.configured || state.records.length > 0 || state.decisions.length > 0) && h(React.Fragment, null,
          h('div', { className: 'jm-metrics' }, ...[['职位与会话', state.counts.total], ['等待回复', state.counts.waiting], ['面试邀约', state.counts.interview], ['待你决定', state.counts.decisions]].map(([label, value]) => h('div', { className: 'jm-card jm-metric', key: label }, h('small', null, label), h('strong', null, value)))),
          h('div', { className: 'jm-grid' }, h('section', { className: 'jm-card' }, h('h2', null, '职位与沟通'), h('div', { className: 'jm-tools' }, h('label', { className: 'jm-sr', htmlFor: 'jm-search' }, '搜索公司或职位'), h('input', { id: 'jm-search', type: 'search', placeholder: '搜索公司或职位', value: query, onChange: e => setQuery(e.target.value) }), h('label', { className: 'jm-sr', htmlFor: 'jm-filter' }, '筛选沟通状态'), h('select', { id: 'jm-filter', value: filter, onChange: e => setFilter(e.target.value) }, h('option', { value: '' }, '全部状态'), ...Object.entries(LABELS).map(([value, label]) => h('option', { key: value, value }, label)))),
            records.length ? h('ul', { className: 'jm-list' }, ...records.map(r => { const key = JSON.stringify([r.account, r.threadKey]); return h('li', { key }, h('button', { type: 'button', className: 'jm-record', 'aria-pressed': selected === key, onClick: () => setSelected(selected === key ? null : key) }, h('span', null, h('strong', null, r.title), h('small', null, r.company), h('small', null, date(r.at))), h('span', { className: 'jm-badge' }, LABELS[r.status] || '状态未知'))) })) : h('p', { className: 'jm-empty' }, query || filter ? '没有符合筛选条件的记录。' : '还没有职位记录。开始一次筛选后，进展会出现在这里。')),
            h('aside', { className: 'jm-stack' }, h('section', { className: 'jm-card' }, h('h2', null, '待你决定'), state.decisions.filter(d => d.status === 'open').length ? state.decisions.filter(d => d.status === 'open').map(d => h('div', { key: d.id, className: 'jm-decision' }, h('strong', null, d.target.company || '工作区核对'), h('p', null, d.question), h(Button, { disabled: blocked, onClick: () => launch('decision', { decisionId: d.id }) }, '在对话中处理'))) : h('p', { className: 'jm-muted' }, '目前没有等待你决定的事项。')),
              state.counts.uncertain > 0 && h('section', { className: 'jm-card' }, h('h2', null, '先核对发送结果'), h('p', null, `${state.counts.uncertain} 个会话的发送结果尚不明确。核对前不会重发。`), h(Button, { onClick: () => setFilter('uncertain') }, '查看待核对会话')))),
          record && h('section', { className: 'jm-card', style: { marginTop: 20 }, 'aria-label': '会话详情' }, h('div', { className: 'jm-head' }, h('div', null, h('h2', null, record.company + ' · ' + record.title), h('small', null, '页面账号：' + record.account)), h(Button, { onClick: () => setSelected(null) }, '收起详情')), h('ol', { className: 'jm-timeline' }, ...record.history.map(e => h('li', { key: e.id }, h('strong', null, KINDS[e.kind] || e.kind), ' · ', h('small', null, date(e.at)), e.status && h('p', null, e.status === 'sent' ? 'Agent 已记录送达' : LABELS[e.status] || '发送结果不明'), e.text && h('p', { className: 'jm-text' }, e.text), e.reasons && h('p', null, e.reasons.join('；')), e.evidence && h('small', null, '记录依据：' + e.evidence)))), h(Button, { disabled: blocked || !!state.run || state.paused, onClick: () => launch('followup', { threadKey: record.threadKey }) }, '在对话中查看这个会话'))),
        state && h('details', { className: 'jm-footer jm-muted' }, h('summary', null, '数据与版本'), h('p', null, state.workspace), h('p', null, `job-mate ${state.version} · 最近更新 ${date(state.updatedAt)}`), h('p', null, '偏好和记录由上游 job-mate 维护。复制整个工作区可备份数据；先结束正在执行的任务。'))
      ))
    }
    return { inject: ['slots', 'uiWorkspace'], apply(ctx) {
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'job-mate', order: 40, label: () => '职伴' }, Icon))
      const Panel = () => h(Workbench, { ctx })
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'job-mate' }, Panel))
    } }
  },
})
