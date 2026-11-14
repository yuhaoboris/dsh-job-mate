/* global window */
window.__ModuleLoader__.load({
  id: '@yuhaoboris/dsh-job-mate',
  factory(require) {
    const React = require('react')
    const { useState, useEffect, useRef, useCallback, useMemo } = React
    const h = React.createElement
    const LABELS = { qualified: '待沟通', pending: '待核实', excluded: '已排除', waiting: '等待回复', replied: '收到回复', interview: '面试邀约', closed: '已结束', uncertain: '发送待核对', failed_no_send: '确定未发' }
    const KINDS = { screen: '筛选职位', greet: '首次沟通', reply: '回复', nudge: '跟进', resume: '发送简历', inbound: '对方消息摘要', observe: '会话观察' }
    // Source palette: job-mate/assets/branding/README.md.
    const BRAND = { mint: '#D0F7E4', green: '#85DF77', lime: '#D2EB35', accent: '#49B86E', black: '#111111' }
    const STYLE = `
    .jm {
      --jm-bg:var(--dsw-alias-bg-base,#fff);
      --jm-surface:var(--dsw-alias-bg-layer-1,#fff);
      --jm-text:var(--dsw-alias-label-primary,#191d25);
      --jm-muted:var(--dsw-alias-label-secondary,#575e6b);
      --jm-line:var(--dsw-alias-border-l2,#e0e3e9);
      --jm-hover:var(--dsw-alias-interactive-bg-hover,#f1f2f5);
      --jm-brand-ink:${BRAND.black};
      --jm-brand-green:${BRAND.green};
      --jm-brand-accent:${BRAND.accent};
      --jm-brand-gradient:linear-gradient(135deg,${BRAND.mint},${BRAND.green} 58%,${BRAND.lime});
      --jm-mint:#1d5839; --jm-mint-wash:${BRAND.mint};
      --jm-lime:#414d09; --jm-lime-wash:color-mix(in srgb,${BRAND.lime} 30%,var(--jm-surface));
      --jm-focus:#246d45;
      --jm-amber:#805219; --jm-amber-wash:#f9eccf;
      --jm-blue:#345b9d; --jm-blue-wash:#e6efff;
      --jm-red:#a03042; --jm-red-wash:#fae6eb;
      container:jm / inline-size;
      height:100%; min-width:0; overflow:auto; scrollbar-gutter:stable;
      background:var(--jm-bg); color:var(--jm-text); font-size:14px; line-height:1.55;
      overflow-wrap:anywhere; accent-color:var(--jm-focus);
    }
    [data-ds-dark-theme] .jm {
      --jm-mint:${BRAND.mint}; --jm-mint-wash:#203a2c;
      --jm-lime:#e7f298; --jm-lime-wash:#343b1a;
      --jm-focus:var(--jm-brand-green);
      --jm-amber:#f6d197; --jm-amber-wash:#453822;
      --jm-blue:#bcd4ff; --jm-blue-wash:#2a3a55;
      --jm-red:#ffbdc8; --jm-red-wash:#4a2c37;
      color-scheme:dark;
    }
    .jm * { box-sizing:border-box }
    .jm-shell { max-width:1176px; margin-inline:auto; padding:34px clamp(30px,5cqw,58px) 48px }
    [data-platform=darwin] .jm-shell { padding-top:calc(34px + var(--dsh-frame-top-clearance,0px)) }
    .jm h1,.jm h2,.jm h3,.jm p { margin:0 }
    .jm h1 { font-size:28px; line-height:1.25; font-weight:650 }
    .jm h2 { font-size:16px; line-height:1.4; font-weight:650 }
    .jm h3 { font-size:14px; line-height:1.45; font-weight:650 }
    .jm small,.jm-muted { color:var(--jm-muted); font-size:12px }
    .jm-head,.jm-row,.jm-section-head { display:flex; align-items:center; gap:8px 12px; flex-wrap:wrap }
    .jm-head,.jm-section-head { justify-content:space-between }
    .jm-head { margin-bottom:24px }
    .jm-title { display:flex; align-items:center; gap:12px }
    .jm-title .jm-glyph { background:var(--jm-brand-gradient); color:var(--jm-brand-ink) }
    .jm-section-head { margin-bottom:12px }
    .jm svg { display:block; flex:none }
    .jm-button {
      display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px;
      border:1px solid var(--jm-line); border-radius:8px; padding:6px 11px; background:var(--jm-surface);
      color:var(--jm-text); font:inherit; font-size:13px; font-weight:550; cursor:pointer;
    }
    .jm-quiet { background:transparent; border-color:transparent; color:var(--jm-muted) }
    .jm-button:enabled:hover,.jm-picker:not([data-disabled]):hover { background:var(--jm-hover); color:var(--jm-text) }
    .jm-primary { background:var(--jm-brand-green); color:var(--jm-brand-ink); border-color:transparent }
    .jm-primary:enabled:hover {
      background:color-mix(in srgb,var(--jm-brand-green) 65%,var(--jm-brand-accent)); color:var(--jm-brand-ink);
    }
    .jm button:disabled,.jm-picker[data-disabled] { opacity:.55; cursor:default }
    .jm :is(button,input,select,summary,a,[tabindex]):focus-visible,.jm-picker:has(input:focus-visible) {
      outline:2px solid var(--jm-focus); outline-offset:2px;
    }
    .jm-card { min-width:0; background:var(--jm-surface); border:1px solid var(--jm-line); border-radius:14px }
    .jm-inset { padding:18px }
    .jm-glyph {
      display:inline-grid; place-items:center; flex:none; width:34px; height:34px;
      border-radius:9px; color:var(--jm-ink,var(--jm-muted)); background:var(--jm-wash,var(--jm-hover));
    }
    .jm [data-tone=mint] { --jm-ink:var(--jm-mint); --jm-wash:var(--jm-mint-wash) }
    .jm [data-tone=lime] { --jm-ink:var(--jm-lime); --jm-wash:var(--jm-lime-wash) }
    .jm [data-tone=amber] { --jm-ink:var(--jm-amber); --jm-wash:var(--jm-amber-wash) }
    .jm [data-tone=blue] { --jm-ink:var(--jm-blue); --jm-wash:var(--jm-blue-wash) }
    .jm [data-tone=red] { --jm-ink:var(--jm-red); --jm-wash:var(--jm-red-wash) }
    .jm-alert {
      display:flex; align-items:flex-start; gap:10px 12px; padding:13px; margin-bottom:18px;
      background:var(--jm-wash,var(--jm-hover)); border:1px solid color-mix(in srgb,var(--jm-ink,var(--jm-text)) 15%,transparent);
      border-radius:12px;
    }
    .jm-alert > div { flex:1; min-width:0; align-self:center }
    .jm-alert > .jm-button { align-self:center }
    .jm-alert .jm-glyph { width:29px; height:29px }
    .jm-alert p + small,.jm-alert strong + p { display:block; margin-top:3px }
    .jm-loaded { margin-bottom:24px }
    .jm-profile { display:flex; flex-direction:column; gap:4px; margin-bottom:12px }
    .jm-profile p { font-size:13px }
    .jm-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px }
    .jm-action {
      display:flex; width:100%; align-items:center; gap:14px; position:relative; isolation:isolate; overflow:hidden;
      padding:15px; text-align:left; color:var(--jm-ink); background:var(--jm-wash); font:inherit;
      border:1px solid color-mix(in srgb,var(--jm-ink) 15%,transparent); border-radius:14px; cursor:pointer;
    }
    .jm-action:enabled:hover { background:color-mix(in srgb,var(--jm-ink) 8%,var(--jm-wash)) }
    .jm-action:enabled:active { background:color-mix(in srgb,var(--jm-ink) 14%,var(--jm-wash)) }
    .jm-action::before,.jm-action::after {
      content:""; position:absolute; z-index:-1; right:28px; width:106px; height:67px;
      border:1px solid currentColor; border-radius:15px; opacity:.12; pointer-events:none;
    }
    .jm-action::before { bottom:-26px; transform:rotate(-15deg) }
    .jm-action::after { bottom:-39px; right:3px; transform:rotate(-15deg) }
    .jm-action[data-tone=lime]::before,.jm-action[data-tone=lime]::after { transform:rotate(13deg); border-radius:24px }
    .jm-action .jm-glyph { width:44px; height:44px; border-radius:11px; background:color-mix(in srgb,var(--jm-ink) 9%,var(--jm-wash)) }
    .jm-action strong,.jm-action small { display:block; color:inherit }
    .jm-action small { margin-top:2px }
    .jm-action > svg { margin-left:auto; align-self:center }
    .jm .jm-action-note { margin-top:8px }
    .jm-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1px; margin:0 0 22px; background:var(--jm-line) }
    .jm-metric { display:grid; grid-template-columns:auto minmax(0,1fr); grid-template-rows:auto auto; align-items:center; gap:0 10px; padding:11px 13px; background:var(--jm-surface) }
    .jm-metric:first-child { border-radius:13px 0 0 13px }
    .jm-metric:last-child { border-radius:0 13px 13px 0 }
    .jm-metric .jm-glyph { grid-row:1 / span 2 }
    .jm-metric dt { color:var(--jm-muted); font-size:12px }
    .jm-metric dd { margin:0; font-size:23px; font-weight:650; font-variant-numeric:tabular-nums; line-height:1.12 }
    .jm-grid { display:grid; grid-template-columns:minmax(0,1.9fr) minmax(220px,1fr); gap:16px; align-items:start }
    .jm-stack { min-width:0; display:grid; gap:14px }
    .jm-tools { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px }
    .jm-field {
      display:flex; align-items:center; gap:8px; position:relative; min-width:0; min-height:36px;
      background:var(--jm-surface); border:1px solid var(--jm-line); border-radius:8px; color:var(--jm-muted);
      padding:0 9px;
    }
    .jm-field:focus-within { outline:2px solid var(--jm-focus); outline-offset:1px }
    .jm-search { flex:1 1 164px }
    .jm-filter { flex:0 1 auto; padding-right:0 }
    .jm-field :is(input,select) { width:100%; min-width:0; min-height:34px; border:0; padding:0; color:var(--jm-text); background:transparent; font:inherit; font-size:13px }
    .jm-field select { padding-right:6px }
    .jm-field option { background:var(--jm-surface) }
    .jm-field :is(input,select):focus-visible { outline:none }
    .jm-field input::placeholder { color:var(--jm-muted) }
    .jm-list { list-style:none; padding:0; margin:0 }
    .jm-list > li + li,.jm-decision + .jm-decision { border-top:1px solid var(--jm-line) }
    .jm-record {
      display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; align-items:center; gap:9px;
      width:100%; padding:10px 6px; border:0; border-radius:8px; text-align:left; font:inherit;
      background:transparent; color:inherit; cursor:pointer;
    }
    .jm-record:hover,.jm-record[aria-expanded=true] { background:var(--jm-hover) }
    .jm-record[aria-expanded=true] > svg,.jm-disclosure[open] > summary > svg:last-child { transform:rotate(180deg) }
    .jm-record > svg { color:var(--jm-muted) }
    .jm-record strong,.jm-record small { display:block }
    .jm-record small { margin-top:2px }
    .jm-record time { color:inherit }
    .jm-badge {
      display:inline-flex; align-items:center; gap:5px; border-radius:6px; padding:2px 7px;
      font-size:11px; font-weight:600; background:var(--jm-wash,var(--jm-hover)); color:var(--jm-ink,var(--jm-muted));
    }
    .jm-badge::before { content:""; width:5px; height:5px; flex:none; border-radius:50%; background:currentColor }
    .jm-empty { display:grid; justify-items:center; gap:8px; padding:23px 10px 18px; text-align:center }
    .jm-empty p { margin:0; max-width:28em }
    .jm-empty strong { font-weight:650 }
    .jm-aside-empty { display:flex; align-items:center; gap:9px; padding-block:8px 3px }
    .jm-decision { padding:12px 0 }
    .jm-decision:first-child { padding-top:0 }
    .jm-decision:last-child { padding-bottom:0 }
    .jm-decision p,.jm-verify p { margin:4px 0 9px }
    .jm-verify { border-color:color-mix(in srgb,var(--jm-amber) 25%,var(--jm-line)) }
    .jm-detail { margin:4px 0 8px; padding:14px; background:var(--jm-surface); border:1px solid var(--jm-line); border-radius:10px }
    .jm-detail > small { display:block; margin-top:2px }
    .jm-timeline { list-style:none; margin:13px 0; padding:0 }
    .jm-timeline li { position:relative; margin-left:4px; padding:0 0 13px 13px; border-left:1px solid var(--jm-line) }
    .jm-timeline li:last-child { padding-bottom:0; border-color:transparent }
    .jm-timeline li::before { content:""; position:absolute; top:6px; left:-4px; width:7px; height:7px; border-radius:50%; background:var(--jm-focus) }
    .jm-event-head { display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 9px }
    .jm-event-head time { color:var(--jm-muted); font-size:12px }
    .jm-timeline p { margin-top:4px }
    .jm-text { white-space:pre-wrap; padding:9px 11px; border-radius:8px; background:var(--jm-hover) }
    .jm-hero { max-width:690px; margin:28px auto 24px; overflow:hidden }
    .jm-hero-head { position:relative; isolation:isolate; padding:26px; color:var(--jm-mint); background:var(--jm-mint-wash); overflow:hidden }
    .jm-hero-head > svg { position:absolute; right:22px; bottom:-28px; z-index:-1; width:166px; height:166px; transform:rotate(15deg); opacity:.15 }
    .jm-hero-head h2 { margin:10px 0 4px; font-size:22px }
    .jm-hero-head .jm-glyph { background:var(--jm-brand-gradient); color:var(--jm-brand-ink) }
    .jm-hero-body { padding:22px 26px }
    .jm-picker {
      display:flex; align-items:center; gap:11px; border:1px dashed var(--jm-muted); border-radius:10px;
      padding:11px; cursor:pointer; margin-bottom:12px; background:var(--jm-surface);
    }
    .jm-picker > span:not(.jm-glyph) { flex:1; min-width:0 }
    .jm-picker strong,.jm-picker small { display:block }
    .jm .jm-resume-current { display:flex; align-items:center; gap:8px; margin-bottom:12px }
    .jm-hero-body .jm-muted:last-child { margin-top:12px }
    .jm-footer { margin-top:22px; border-top:1px solid var(--jm-line); padding-top:8px; color:var(--jm-muted); font-size:12px }
    .jm-disclosure > summary { list-style:none; display:flex; gap:7px; align-items:center; width:fit-content; min-height:34px; padding:3px 6px; border-radius:7px; cursor:pointer }
    .jm-disclosure > summary::-webkit-details-marker { display:none }
    .jm-disclosure > summary:hover { background:var(--jm-hover) }
    .jm-disclosure > summary > svg:last-child { margin-left:2px }
    .jm-footer p { margin:4px 6px }
    .jm-update[data-visible] { padding:13px 15px; margin-bottom:18px }
    .jm-update-head { display:flex; align-items:center; flex-wrap:wrap; gap:7px 10px; justify-content:space-between }
    .jm-update p { margin-top:6px }
    .jm-update-notes { padding:10px 12px; max-height:220px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; background:var(--jm-hover); border-radius:8px }
    .jm-update a { color:var(--jm-mint); text-decoration:underline; text-underline-offset:2px }
    .jm-update time { color:var(--jm-muted); font-size:12px }
    .jm-update-body { margin:5px 0 8px 6px }
    .jm-update-body .jm-button { margin:8px 0 }
    .jm-update[data-visible] .jm-disclosure { margin-top:8px }
    .jm-update-meta { font-variant-numeric:tabular-nums }
    .jm-sr { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0 }
    @container jm (max-width:760px) {
      .jm-shell { padding-inline:24px }
      .jm-grid { grid-template-columns:minmax(0,1fr); gap:12px }
    }
    @container jm (max-width:580px) {
      .jm-metrics { grid-template-columns:repeat(2,minmax(0,1fr)) }
      .jm-metric:nth-child(1) { border-radius:13px 0 0 0 }
      .jm-metric:nth-child(2) { border-radius:0 13px 0 0 }
      .jm-metric:nth-child(3) { border-radius:0 0 0 13px }
      .jm-metric:nth-child(4) { border-radius:0 0 13px 0 }
    }
    @container jm (max-width:440px) {
      .jm-shell { padding-inline:14px; padding-bottom:24px }
      .jm-head { margin-bottom:16px }
      .jm h1 { font-size:23px }
      .jm-title { gap:8px }
      .jm-actions { grid-template-columns:minmax(0,1fr); gap:8px }
      .jm-action { padding:10px; gap:10px }
      .jm-inset { padding:12px }
      .jm-record { grid-template-columns:minmax(0,1fr) auto auto; padding-inline:4px }
      .jm-record > .jm-glyph { display:none }
      .jm-hero-head,.jm-hero-body { padding:16px }
    }
    `
    async function api(path, data) {
      const response = await fetch('/api/job-mate' + path, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: data === undefined ? {} : { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw Object.assign(new Error(result?.error?.message || '读取失败，请重试'), { status: response.status })
      return result
    }
    function date(value) { if (!value) return '时间未知'; const d = new Date(value); return Number.isNaN(d.valueOf()) ? '时间未知' : d.toLocaleString() }
    const ICONS = {
      briefcase: 'M6 7h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Zm2 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v3h4v-3',
      search: 'M16 10.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-1.6 3.9L20 20',
      message: 'M20 14a3 3 0 0 1-3 3h-6l-5 4v-4a3 3 0 0 1-2-3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Zm-12-3h8',
      arrow: 'M4 12h15m-6-6 6 6-6 6',
      chevron: 'm6 9 6 6 6-6',
      sliders: 'M4 7h6m4 0h6M4 17h10m4 0h2M10 4v6m4 4v6',
      refresh: 'M20 10a8 8 0 1 0-2 7m2-13v6h-6',
      filter: 'M4 6h16M7 12h10m-7 6h4',
      inbox: 'M4 13 7 5h10l3 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm0 0h5l1 3h4l1-3h5',
      clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2',
      calendar: 'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2-2v4m8-4v4M4 10h16m-11 5 2 2 4-4',
      check: 'm5 12 4 4L19 6',
      decision: 'M9 7H5v14h14V7h-4m-6 8 2 2 4-4M9 4h6v5H9Z',
      file: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v6h5M9 13h6m-6 4h5',
      upload: 'M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
      info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 0v4m0-8v.1',
      warning: 'M10.3 4.5 3 18a1.5 1.5 0 0 0 1.3 2h15.4a1.5 1.5 0 0 0 1.3-2L13.7 4.5a2 2 0 0 0-3.4 0ZM12 9v4m0 3v.1',
      pause: 'M9 5v14m6-14v14',
      update: 'M7 10l5-5 5 5m-5-5v11m-7-1v4h14v-4',
    }
    const BADGE_TONES = {
      qualified: 'mint', pending: 'amber', waiting: 'blue', replied: 'mint',
      interview: 'lime', uncertain: 'amber', failed_no_send: 'red',
    }

    function Icon({ name = 'briefcase', size = 16 } = {}) {
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: ICONS[name] }))
    }
    function Glyph({ name, tone, size }) {
      return h('span', { className: 'jm-glyph', 'data-tone': tone }, h(Icon, { name, size }))
    }
    function Button({ children, primary, quiet, icon, ...props }) {
      const variant = primary ? ' jm-primary' : quiet ? ' jm-quiet' : ''
      return h('button', { type: 'button', ...props, className: 'jm-button' + variant }, icon && h(Icon, { name: icon }), children)
    }
    function Time({ value }) {
      return h('time', { dateTime: value || undefined }, date(value))
    }
    function Badge({ status }) {
      return h('span', { className: 'jm-badge', 'data-tone': BADGE_TONES[status] }, LABELS[status] || '状态未知')
    }
    function Alert({ title, children, tone, icon, action, error }) {
      return h('div', { className: 'jm-alert', 'data-tone': tone, role: error ? 'alert' : 'status' },
        h(Glyph, { name: icon, tone }), h('div', null, title && h('strong', null, title), children), action)
    }
    function ActionTile({ label, description, icon, tone, ...props }) {
      const labelId = 'jm-action-' + icon
      const descriptionId = labelId + '-description'
      return h('button', { type: 'button', className: 'jm-action', 'data-tone': tone,
        'aria-labelledby': labelId, 'aria-describedby': descriptionId, ...props },
        h(Glyph, { name: icon, tone, size: 23 }),
        h('span', null, h('strong', { id: labelId }, label), h('small', { id: descriptionId }, description)),
        h(Icon, { name: 'arrow' }))
    }
    function Disclosure({ label, icon, children, className = '', open }) {
      return h('details', { className: 'jm-disclosure ' + className, open },
        h('summary', null, icon && h(Icon, { name: icon }), label, h(Icon, { name: 'chevron', size: 13 })), children)
    }
    const SIDEBAR_STYLE = `
    button:has(.jm-update-pill) { position:relative }
    .jm-update-pill {
      position:absolute; right:32px; top:50%; transform:translateY(-50%); border-radius:7px; padding:0 6px;
      font-size:11px; line-height:18px; background:${BRAND.mint};
      color:${BRAND.black}; white-space:nowrap;
    }
    .jm-update-icon { position:relative; display:inline-flex }
    .jm-update-dot { position:absolute; right:-3px; top:-3px; width:8px; height:8px; border-radius:50%; background:${BRAND.accent}; border:1px solid var(--dsw-alias-label-secondary,#575e6b) }
    .jm-update-dot[data-failed] { background:var(--dsw-alias-state-error-primary,#a03042) }
    .jm-update-pill[data-failed] { background:#fae6eb; color:#a03042 }
    `
    let updateState = { phase: 'idle' }, updateChecking = false, updateInstalling = false, updateGeneration = 0, updateTimer
    const updateListeners = new Set()
    function publishUpdate(value) { updateState = value; for (const listener of updateListeners) listener({ ...value, checking: updateChecking }) }
    async function refreshUpdates(force = false) {
      if (updateChecking || updateInstalling) return
      const generation = ++updateGeneration
      updateChecking = true; publishUpdate(updateState)
      try { const result = await api(force ? '/updates/check' : '/updates', force ? {} : undefined); if (generation === updateGeneration) publishUpdate(result.update) }
      catch (e) { if (generation === updateGeneration) publishUpdate({ ...updateState, error: e.message, phase: 'check-failed', canInstall: false }) }
      finally { if (generation === updateGeneration) { updateChecking = false; publishUpdate(updateState) } }
    }
    async function installUpdate() {
      if (!updateState.canInstall || updateState.phase === 'installing') return
      ++updateGeneration; updateChecking = false; updateInstalling = true
      publishUpdate({ ...updateState, phase: 'installing', canInstall: false, error: null })
      try { const result = await api('/updates/install', {}); publishUpdate(result.update) }
      catch (e) { publishUpdate({ ...updateState, phase: 'failed', error: '无法确认更新结果。检查更新以核对安装状态：' + e.message }) }
      finally { updateInstalling = false }
    }
    function useUpdates() {
      const [value, setValue] = useState(() => ({ ...updateState, checking: updateChecking }))
      useEffect(() => {
        updateListeners.add(setValue)
        setValue({ ...updateState, checking: updateChecking })
        if (updateListeners.size === 1) {
          refreshUpdates()
          updateTimer = setInterval(() => refreshUpdates(), 60000)
        }
        return () => { updateListeners.delete(setValue); if (!updateListeners.size) clearInterval(updateTimer) }
      }, [])
      return value
    }
    function UpdateIcon({ size = 16 }) {
      const update = useUpdates()
      const mark = { installing: '更新中', restart: '待重启', failed: '更新失败' }[update.phase] || (update.available && '有更新')
      return h(React.Fragment, null, h('style', null, SIDEBAR_STYLE),
        size <= 16 ? h(React.Fragment, null, h(Icon, { size }),
          mark && h('span', { className: 'jm-update-pill', 'aria-label': '职伴：' + mark, 'data-failed': update.phase === 'failed' || undefined }, mark))
          : h('span', { className: 'jm-update-icon' }, h(Icon, { size }), mark && h('span', {
            className: 'jm-update-dot', role: 'img', 'aria-label': '职伴：' + mark, title: mark, 'data-failed': update.phase === 'failed' || undefined,
          })))
    }
    function UpdatePanel({ update, taskRunning, ready }) {
      const working = update.phase === 'installing'
      const restart = update.phase === 'restart'
      const visible = working || restart || update.available || Boolean(update.error)
      const title = restart ? `职伴已安装 ${update.installedVersion}，待重启` : working ? '正在更新职伴…'
        : update.available ? `职伴有新版本 ${update.release.version}` : '职伴插件更新'
      const meta = h('small', { className: 'jm-update-meta' }, update.currentVersion ? `当前运行 ${update.currentVersion}`
        : update.checking || update.phase === 'idle' ? '正在检查版本…' : '当前版本不可用',
      update.checkedAt && h(React.Fragment, null, ' · 上次检查 ', h(Time, { value: update.checkedAt })))
      const checkButton = h(Button, { icon: 'refresh', disabled: working || update.checking, onClick: () => refreshUpdates(true) },
        update.checking ? '检查中…' : '检查更新')
      const release = update.release && h(Disclosure, { label: '更新日志 · ' + update.release.version, open: update.available || restart || undefined },
        h('div', { className: 'jm-update-notes', tabIndex: 0, 'aria-label': '更新日志内容' },
          update.release.publishedAt && h(Time, { value: update.release.publishedAt }),
          h('div', null, update.release.notes || '此版本未提供更新日志。')),
        h('p', null, h('a', { href: update.release.url, target: '_blank', rel: 'noopener noreferrer' }, '在 GitHub 查看完整发布')))
      if (!visible) {
        return h('section', { className: 'jm-update', 'aria-label': '插件更新', 'aria-busy': update.checking },
          h(Disclosure, { label: update.currentVersion ? '插件版本 · ' + update.currentVersion : '插件版本', icon: 'update' },
            h('div', { className: 'jm-update-body' }, meta, h('div', null, checkButton), release)))
      }
      return h('section', { className: 'jm-card jm-update', 'data-visible': true, 'aria-label': '插件更新', 'aria-busy': working || update.checking },
        h('div', { className: 'jm-update-head' },
          h('div', { className: 'jm-row' }, h(Glyph, { name: restart ? 'check' : 'update', tone: update.error ? 'red' : 'mint' }),
            h('div', null, h('h2', null, title), meta)),
          h('div', { className: 'jm-row' }, checkButton,
            !restart && update.available && h(Button, {
              primary: true, disabled: !update.canInstall || taskRunning || !ready || working || update.checking, onClick: installUpdate,
            }, working ? '更新中…' : update.phase === 'failed' ? '重试更新' : '更新插件'))),
        restart && h('p', { role: 'status' }, '退出 DSH 再重新打开后生效。求职资料保留在原工作区。'),
        working && h('p', { role: 'status' }, 'DSH 正在下载并安装更新，请稍候。'),
        update.error && h('p', { role: 'alert' }, update.error),
        update.available && !restart && !working && h('p', { className: 'jm-muted' },
          taskRunning ? '请先结束正在执行的求职任务，再更新插件。' : update.reason || '更新由 DSH 插件管理器安装，完成后按提示重启。'),
        release)
    }

    function ResumeSetup({ resume, file, busy, blocked, onFile, onUpload, onContinue }) {
      const input = useRef(null)
      useEffect(() => { if (!file && input.current) input.current.value = '' }, [file])
      return h('section', { className: 'jm-card jm-hero', 'aria-labelledby': 'jm-resume-title' },
        h('div', { className: 'jm-hero-head' }, h(Glyph, { name: 'file' }), h(Icon, { name: 'file' }),
          h('h2', { id: 'jm-resume-title' }, resume ? '简历已就绪，接下来确认求职偏好' : '一份简历，就可以开始'),
          h('p', null, 'Agent 会根据你的经历整理资料，并询问你想找的工作。')),
        h('div', { className: 'jm-hero-body' },
          resume && h('p', { className: 'jm-resume-current' }, h(Icon, { name: 'check' }), h('span', null, '当前简历 ', h('strong', null, resume.name))),
          h('label', { className: 'jm-picker', 'data-disabled': blocked || undefined },
            h(Glyph, { name: 'upload' }),
            h('span', null, h('strong', null, file?.name || (resume ? '更换简历' : '选择一份简历')),
              h('small', { id: 'jm-resume-formats' }, 'PDF / DOCX / HTML / TXT / Markdown · 最大 5 MB')),
            h('input', { ref: input, className: 'jm-sr', type: 'file', accept: '.pdf,.docx,.html,.htm,.txt,.md',
              'aria-label': resume ? '更换简历' : '选择一份简历', 'aria-describedby': 'jm-resume-formats',
              disabled: blocked, onChange: event => onFile(event.target.files?.[0] || null) }),
            h(Icon, { name: 'chevron' })),
          h('div', { className: 'jm-row' }, file
            ? h(React.Fragment, null,
              h(Button, { primary: true, disabled: blocked, onClick: onUpload }, busy ? '正在读取…' : '读取这份简历'),
              h(Button, { quiet: true, disabled: busy, onClick: () => onFile(null) }, '取消选择'))
            : h(Button, { primary: Boolean(resume), icon: 'message', disabled: blocked, onClick: onContinue },
              resume ? '继续对话，确认求职偏好' : '在对话中提供简历')),
          h('p', { className: 'jm-muted' }, '简历保存在本机工作区。Agent 分析时可能将内容交给你所用的模型服务。')))
    }

    function Metrics({ counts }) {
      const items = [
        ['职位与会话', counts.total, 'briefcase', 'mint'], ['等待回复', counts.waiting, 'clock', 'blue'],
        ['面试邀约', counts.interview, 'calendar', 'lime'], ['待你决定', counts.decisions, 'decision', 'amber'],
      ]
      return h('dl', { className: 'jm-card jm-metrics', 'aria-label': '求职统计' }, items.map(([label, value, icon, tone]) =>
        h('div', { key: label, className: 'jm-metric' }, h(Glyph, { name: icon, tone }), h('dt', null, label), h('dd', null, value))))
    }

    function RecordDetails({ record, id, disabled, onFollowup }) {
      return h('section', { id, className: 'jm-detail', 'aria-label': '会话详情' },
        h('h3', null, '沟通历史'), h('small', null, '页面账号 ', record.account),
        h('ol', { className: 'jm-timeline' }, record.history.map(event =>
          h('li', { key: event.id },
            h('div', { className: 'jm-event-head' }, h('strong', null, KINDS[event.kind] || event.kind), h(Time, { value: event.at })),
            event.status && h('p', null, event.status === 'sent' ? 'Agent 已记录送达' : LABELS[event.status] || '发送结果不明'),
            event.text && h('p', { className: 'jm-text' }, event.text),
            event.reasons?.length > 0 && h('p', null, event.reasons.join('；')),
            event.evidence && h('small', null, '记录依据 ', event.evidence)))),
        h(Button, { icon: 'message', disabled, onClick: () => onFollowup(record.threadKey) }, '在对话中查看这个会话'))
    }

    function RecordList({ records, query, filter, filterRef, selected, disabled, onSearch, onFilter, onSelect, onFollowup }) {
      const searchRef = useRef(null)
      function clearFilters() {
        onSearch('')
        onFilter('')
        searchRef.current?.focus()
      }
      return h('section', { className: 'jm-card jm-inset', 'aria-labelledby': 'jm-record-heading' },
        h('div', { className: 'jm-section-head' }, h('h2', { id: 'jm-record-heading' }, '职位与沟通'),
          h('small', { role: 'status' }, records.length + ' 条记录')),
        h('div', { className: 'jm-tools' },
          h('label', { className: 'jm-field jm-search' }, h(Icon, { name: 'search' }),
            h('span', { className: 'jm-sr' }, '搜索公司或职位'),
            h('input', { id: 'jm-search', ref: searchRef, type: 'search', placeholder: '搜索公司或职位',
              value: query, onChange: event => onSearch(event.target.value) })),
          h('label', { className: 'jm-field jm-filter' }, h(Icon, { name: 'filter' }),
            h('span', { className: 'jm-sr' }, '筛选沟通状态'),
            h('select', { id: 'jm-filter', ref: filterRef, value: filter, onChange: event => onFilter(event.target.value) },
              h('option', { value: '' }, '全部状态'),
              Object.entries(LABELS).map(([value, label]) => h('option', { key: value, value }, label))))),
        records.length ? h('ul', { className: 'jm-list' }, records.map((record, index) => {
          const key = JSON.stringify([record.account, record.threadKey])
          const expanded = selected === key
          const detailId = 'jm-record-detail-' + index
          return h('li', { key },
            h('button', { type: 'button', className: 'jm-record', 'aria-expanded': expanded,
              'aria-controls': expanded ? detailId : undefined, onClick: () => onSelect(expanded ? null : key) },
              h(Glyph, { name: 'briefcase', tone: BADGE_TONES[record.status] }),
              h('span', null, h('strong', null, record.title), h('small', null, record.company, ' · ', h(Time, { value: record.at }))),
              h(Badge, { status: record.status }), h(Icon, { name: 'chevron', size: 14 })),
            expanded && h(RecordDetails, { id: detailId, record, disabled, onFollowup }))
        })) : h('div', { className: 'jm-empty' }, h(Glyph, { name: query || filter ? 'search' : 'inbox' }),
          query || filter
            ? h(React.Fragment, null, h('strong', null, '没有符合筛选条件的记录'),
              h(Button, { quiet: true, onClick: clearFilters }, '清除筛选'))
            : h(React.Fragment, null, h('strong', null, '还没有职位记录'),
              h('p', { className: 'jm-muted' }, '开始一次筛选后，进展会出现在这里。'))))
    }

    function Decisions({ decisions, uncertain, disabled, onDecision, onVerify }) {
      return h('aside', { className: 'jm-stack', 'aria-label': '待处理事项' },
        uncertain > 0 && h('section', { className: 'jm-card jm-inset jm-verify' },
          h('div', { className: 'jm-row' }, h(Glyph, { name: 'warning', tone: 'amber' }), h('h2', null, '先核对发送结果')),
          h('p', null, `${uncertain} 个会话的发送结果尚不明确。核对前不会重发。`),
          h(Button, { icon: 'search', onClick: onVerify }, '查看待核对会话')),
        h('section', { className: 'jm-card jm-inset', 'aria-labelledby': 'jm-decisions' },
          h('div', { className: 'jm-section-head' },
            h('div', { className: 'jm-row' }, h(Glyph, { name: 'decision', tone: 'amber' }), h('h2', { id: 'jm-decisions' }, '待你决定')),
            h('small', null, decisions.length + ' 项')),
          decisions.length ? h('div', null, decisions.map(decision => h('div', { key: decision.id, className: 'jm-decision' },
            h('h3', null, decision.target.company || '工作区核对'), h('p', null, decision.question),
            h(Button, { icon: 'message', disabled, onClick: () => onDecision(decision.id) }, '在对话中处理'))))
            : h('p', { className: 'jm-muted jm-aside-empty' }, h(Icon, { name: 'check' }), '目前没有等待你决定的事项。')))
    }

    function Workbench({ ctx }) {
      const updates = useUpdates()
      const [state, setState] = useState(null)
      const [error, setError] = useState('')
      const [actionError, setActionError] = useState('')
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState('')
      const [query, setQuery] = useState('')
      const [filter, setFilter] = useState('')
      const [selected, setSelected] = useState(null)
      const [file, setFile] = useState(null)
      const alive = useRef(true), generation = useRef(0), working = useRef(false)
      const filterRef = useRef(null)

      const hidePrivateData = useCallback(() => {
        setState(null)
        setFile(null)
        setSelected(null)
        setQuery('')
        setFilter('')
        setNotice('')
        setActionError('')
      }, [])
      const refresh = useCallback(async () => {
        const gen = ++generation.current
        try {
          const value = await api('/state')
          if (alive.current && gen === generation.current) {
            setState(value.state)
            setError('')
          }
        } catch (e) {
          if (alive.current && gen === generation.current) {
            if (e.status === 401 || e.status === 403) hidePrivateData()
            setError(e.message)
          }
        }
      }, [hidePrivateData])
      useEffect(() => {
        alive.current = true
        refresh()
        const timer = setInterval(() => { if (!working.current) refresh() }, 10000)
        return () => { alive.current = false; generation.current++; clearInterval(timer) }
      }, [refresh])

      async function perform(action) {
        if (working.current) return
        working.current = true
        generation.current++
        setBusy(true)
        setNotice('')
        setActionError('')
        try {
          await action()
          if (alive.current) await refresh()
        } catch (e) {
          if (alive.current) {
            if (e.status === 401 || e.status === 403) {
              hidePrivateData()
              setError(e.message)
            } else {
              setActionError(e.message)
            }
          }
        } finally {
          working.current = false
          if (alive.current) setBusy(false)
        }
      }
      function launch(task, extra = {}) {
        return perform(async () => {
          if (!ctx.uiWorkspace?.startSession) throw new Error('当前宿主不支持会话入口，请在会话里调用职伴技能')
          const session = await api('/session', { task, ...extra })
          await ctx.uiWorkspace.startSession(session.workspaceId, { prompt: session.prompt, whenDraftExists: 'append' })
        })
      }
      function chooseFile(nextFile) {
        setActionError('')
        setFile(nextFile)
      }
      function upload() {
        if (!file) return
        return perform(async () => {
          if (file.size > 5 * 1024 * 1024) throw new Error('简历不能超过 5 MB')
          const bytes = new Uint8Array(await file.arrayBuffer())
          let binary = ''
          for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
          const result = await api('/resume', { name: file.name, data: btoa(binary) })
          if (alive.current) {
            setState(result.state)
            setFile(null)
            setNotice(['简历已保存。继续对话，由 Agent 整理事实并询问偏好。', ...result.resume.warnings].join(' '))
          }
        })
      }

      const records = useMemo(() => {
        const search = query.trim().toLowerCase()
        return (state?.records || []).filter(record =>
          (!filter || record.status === filter) && (!search || (record.company + ' ' + record.title).toLowerCase().includes(search)))
      }, [state, query, filter])
      const decisions = state?.decisions.filter(decision => decision.status === 'open')
      const updating = updates.phase === 'installing'
      const blocked = busy || Boolean(error) || updating
      const intro = !state?.configured || state.resumeNeedsReview
      const taskBlocked = blocked || Boolean(state?.run) || state?.paused
      const hasProgress = state && (state.configured || state.records.length > 0 || state.decisions.length > 0)
      const togglePause = paused => perform(() => api('/pause', { paused }))
      const profile = state?.profile
      const salary = profile?.salary
      const salaryLabel = salary ? `${salary.min}–${salary.max} ${salary.currency}/${salary.period === 'month' ? '月' : '年'}` : '薪资不设筛选门槛'

      return h('main', { className: 'jm', 'aria-busy': busy }, h('style', null, STYLE),
        h('div', { className: 'jm-shell' },
          h('header', { className: 'jm-head' },
            h('div', { className: 'jm-title' }, h(Glyph, { name: 'briefcase', size: 19 }), h('h1', null, '求职工作台')),
            h('div', { className: 'jm-row' },
              state?.configured && h(Button, { quiet: true, icon: 'sliders', disabled: blocked, onClick: () => launch('preferences') }, '调整求职偏好'),
              h(Button, { quiet: true, icon: 'refresh', disabled: busy, onClick: refresh }, '刷新'))),
          (updating || updates.phase === 'restart' || updates.available || updates.error) &&
            h(UpdatePanel, { key: 'update-alert', update: updates, taskRunning: Boolean(state?.run), ready: Boolean(state) && !busy && !error }),
          error && h(Alert, { error: true, tone: 'red', icon: 'warning', title: '读取求职进展失败' },
            h('p', null, error), state && h('small', null, '以下为上次完整快照，恢复读取前不能发起任务。')),
          actionError && h(Alert, { error: true, tone: 'red', icon: 'warning' }, h('p', null, actionError)),
          notice && h(Alert, { tone: 'mint', icon: 'check' }, h('p', null, notice)),
          !state && !error && h(Alert, { icon: 'clock' }, h('p', null, '正在读取求职进展…')),
          state && intro && h(ResumeSetup, { resume: state.resume, file, busy, blocked: blocked || Boolean(state.run),
            onFile: chooseFile, onUpload: upload, onContinue: () => launch('onboarding') }),
          state?.paused && h(Alert, { tone: 'amber', icon: 'pause', title: '求职任务已暂停',
            action: h(Button, { disabled: blocked, onClick: () => togglePause(false) }, '解除暂停') },
          h('p', null, 'Agent 的下一次发送前检查会停止外发。')),
          state?.run && h(Alert, { tone: 'blue', icon: 'clock', title: '任务正在执行',
            action: h(Button, { disabled: blocked || state.paused, onClick: () => togglePause(true) }, '暂停后续操作') },
          h('p', null, `${state.run.skill === 'apply' ? '筛选职位' : '处理消息'} · ${state.run.noSend ? '只读模式' : '按本轮授权执行'}`)),
          state?.configured && h('section', { className: 'jm-loaded', 'aria-label': '求职任务' },
            h('div', { className: 'jm-profile' }, h('h2', null, profile.targetRoles.join(' / ')),
              h('p', { className: 'jm-muted' }, [profile.locations.join(' · '), salaryLabel].filter(Boolean).join(' · '))),
            h('div', { className: 'jm-actions' },
              h(ActionTile, { label: '筛选职位', description: '按求职偏好筛选 BOSS 直聘岗位', icon: 'search', tone: 'mint',
                disabled: taskBlocked || intro, onClick: () => launch('apply') }),
              h(ActionTile, { label: '查看 HR 消息', description: '汇总回复和需要处理的会话', icon: 'message', tone: 'lime',
                disabled: taskBlocked, onClick: () => launch('followup') })),
            h('p', { className: 'jm-muted jm-action-note' }, '点击后打开可编辑的会话草稿。')),
          hasProgress && h(React.Fragment, null,
            h('div', { className: 'jm-section-head' }, h('h2', null, '求职进展'), h('small', null, '根据 Agent 记录汇总')),
            h(Metrics, { counts: state.counts }),
            h('div', { className: 'jm-grid' },
              h(RecordList, { records, query, filter, filterRef, selected, disabled: taskBlocked, onSearch: setQuery,
                onFilter: setFilter, onSelect: setSelected, onFollowup: threadKey => launch('followup', { threadKey }) }),
              h(Decisions, { decisions, uncertain: state.counts.uncertain, disabled: blocked,
                onDecision: decisionId => launch('decision', { decisionId }), onVerify: () => {
                  setQuery('')
                  setFilter('uncertain')
                  filterRef.current?.focus()
                } }))),
          h('footer', { className: 'jm-footer' },
            !(updating || updates.phase === 'restart' || updates.available || updates.error) &&
              h(UpdatePanel, { key: 'update-version', update: updates }),
            state && h(Disclosure, { label: '数据与版本', icon: 'info' },
              h('p', null, state.workspace),
              h('p', null, `job-mate ${state.version} · 最近更新 `, h(Time, { value: state.updatedAt })),
              h('p', null, '偏好和记录由上游 job-mate 维护。结束正在执行的任务后，可复制整个工作区备份数据。')))))
    }
    return { inject: ['slots', 'uiWorkspace'], apply(ctx) {
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'job-mate', order: 40, label: () => '职伴' }, UpdateIcon))
      const Panel = () => h(Workbench, { ctx })
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'job-mate' }, Panel))
    } }
  },
})
