import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

export function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...(tree.children ?? []).flat(Infinity).flatMap(nodes)]
}
export const textOf = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) :
  Array.isArray(tree) ? tree.map(textOf).join('') : tree?.children?.map(textOf).join('') ?? ''
const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]))
export const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

/** Real Client factory and child component lifecycle; host DOM/network/timers are adapters.
 * Hook dependency caches and per-instance state survive rerenders and are removed on unmount.
 * This is not a browser/React reconciler conformance test.
 */
export async function mount({ initialResponse, recordsResponse, uiWorkspace } = {}) {
  let module, Panel, active, cursor, pending = [], dirty = false, response, tree
  const instances = new Map(), timers = new Map(), requests = [], queued = []
  let nextTimer = 0
  const state = { schemaVersion: 2, version: '2.0.0', workspace: '/fixture', configured: false,
    profile: null, resume: null, run: null, records: [], decisions: [], attempts: [], counts: {total:0,waiting:0,interview:0,decisions:0,uncertain:0} }
  response = initialResponse ?? { ok: true, state }
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children }, children }),
    useState(initial) {
      const index = cursor++, owner = active
      if (!(index in owner.values)) owner.values[index] = typeof initial === 'function' ? initial() : initial
      return [owner.values[index], value => {
        const next = typeof value === 'function' ? value(owner.values[index]) : value
        if (!Object.is(next, owner.values[index])) { owner.values[index] = next; dirty = true }
      }]
    },
    useRef(initial) { const index = cursor++; return active.values[index] ??= { current: initial } },
    useMemo(factory, next) {
      const index = cursor++
      if (changed(active.deps[index], next)) { active.values[index] = factory(); active.deps[index] = next }
      return active.values[index]
    },
    useCallback(value, next) { return react.useMemo(() => value, next) },
    useEffect(effect, next) {
      const index = cursor++, owner = active
      if (changed(owner.deps[index], next)) {
        owner.deps[index] = next
        pending.push(() => { owner.cleanups[index]?.(); owner.cleanups[index] = effect() })
      }
    },
  }
  runInNewContext(await readFile(new URL('../../client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { module = value.factory(() => react) } } },
    fetch: async (url, init) => {
      requests.push({ url, init, body: init?.body ? JSON.parse(init.body) : null })
      const next = queued.length ? queued.shift() : structuredClone(url.endsWith('/records')
        ? recordsResponse ?? { ok: true, records: response.state?.records ?? [], history: [],
          workspaceVersion: response.state?.settings?.workspaceVersion, ledger: response.state?.ledger }
        : response)
      const payload = await next
      return { ok: payload.ok, status: payload.status ?? (payload.ok ? 200 : 403), json: async () => payload }
    },
    setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer },
    clearTimeout(id) { timers.delete(id) },
    setInterval(callback) { timers.set(++nextTimer, callback); return nextTimer },
    clearInterval(id) { timers.delete(id) },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
  })
  const services = { uiWorkspace, slots: { inject(_name, fn) { fn() }, register(slot, component) { if (slot.name === 'main') Panel = component } } }
  module.apply(new Proxy(services, { get(target, name) {
    if (!module.inject.includes(name)) throw new Error(`cannot get property ${String(name)} without inject`)
    return target[name]
  } }))
  function expand(node, path, seen) {
    if (Array.isArray(node)) return node.map((value, i) => expand(value, `${path}.${i}`, seen))
    if (!node || typeof node !== 'object') return node
    if (typeof node.type === 'function') {
      const identity = `${path}:${node.type.name}`
      let instance = instances.get(identity)
      if (!instance || instance.type !== node.type) {
        instance?.cleanups.forEach(fn => fn?.())
        instance = { type: node.type, values: [], deps: [], cleanups: [] }
        instances.set(identity, instance)
      }
      seen.add(identity)
      active = instance; cursor = 0
      const output = node.type(node.props)
      return { ...node, children: [expand(output, `${identity}.render`, seen)] }
    }
    return { ...node, children: (node.children ?? []).map((child, i) => expand(child, `${path}.${i}`, seen)) }
  }
  function render() {
    let rounds = 0
    do {
      if (++rounds > 30) throw new Error('Hook harness did not settle')
      dirty = false
      const seen = new Set()
      tree = expand(react.createElement(Panel, {}), 'root', seen)
      for (const [identity, owner] of instances) if (!seen.has(identity)) {
        owner.cleanups.forEach(fn => fn?.()); instances.delete(identity)
      }
      const effects = pending; pending = []; effects.forEach(effect => effect())
    } while (dirty)
    return tree
  }
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); render() }
  render(); await flush()
  const api = {
    render, flush, state, timers, requestLog: requests,
    get requests() { return requests.length },
    setResponse(value) { response = value },
    deferNext() { const gate = deferred(); queued.push(gate.promise); return gate },
    findButton(label) { return nodes(render()).find(node => node.type === 'button' && textOf(node).includes(label)) },
    click(label) {
      const button = api.findButton(label)
      assert.ok(button, `Button not found: ${label}`)
      assert.equal(Boolean(button.props.disabled), false, `Button disabled: ${label}`)
      const result = button.props.onClick(); render(); return result
    },
    change(id, value) {
      const input = nodes(render()).find(node => node.type === 'input' || node.type === 'textarea' ? node.props.id === id : false)
      assert.ok(input, `Input not found: ${id}`)
      input.props.onChange({ target: { value } }); render()
    },
    value(id) { return nodes(render()).find(node => (node.type === 'input' || node.type === 'textarea') && node.props.id === id)?.props.value },
    async tick() { const entries = [...timers]; timers.clear(); for (const [, fn] of entries) fn(); await flush() },
    dispose() { for (const owner of instances.values()) owner.cleanups.forEach(fn => fn?.()); instances.clear() },
  }
  return api
}
