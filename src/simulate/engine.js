import { pinType } from '../pins.js';
import * as nodes from './nodes.js';

let seq = 0;
const nextId = () => `ev${++seq}`;

export class Engine {
  constructor(rule, opts = {}) {
    this.rule = rule;
    this.nodes = rule.nodes ?? [];
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.time = 0;
    this.devices = new Map(); // did -> Map(siid -> Map(piid -> value))
    this.vars = new Map(); // scope -> Map(id -> value)
    this.mem = new Map(); // 图内状态
    this.queue = []; // 按 t 升序的待处理事件
    this.log = [];
    this.trace = [];
    this.listener = opts.listener ?? null;
  }

  logLine(kind, nodeId, text) {
    const entry = { t: this.time, kind, nodeId, text };
    this.log.push(entry);
    if (this.listener) this.listener(entry);
    return entry;
  }

  setDevice(did, siid, piid, value) {
    if (!this.devices.has(did)) this.devices.set(did, new Map());
    const svc = this.devices.get(did);
    if (!svc.has(siid)) svc.set(siid, new Map());
    const changed = svc.get(siid).get(piid) !== value;
    svc.get(siid).set(piid, value);
    this.logLine('state', null, `设备 ${did} siid=${siid} piid=${piid} → ${JSON.stringify(value)}`);
    if (changed) this.onStateChanged(did, siid, piid);
    return this;
  }

  getDevice(did, siid, piid) {
    return this.devices.get(did)?.get(siid)?.get(piid);
  }

  setVar(scope, id, value) {
    if (!this.vars.has(scope)) this.vars.set(scope, new Map());
    const changed = this.vars.get(scope).get(id) !== value;
    this.vars.get(scope).set(id, value);
    this.logLine('state', null, `变量 ${scope}.${id} → ${JSON.stringify(value)}`);
    if (changed) this.onVarChanged(scope, id);
    return this;
  }

  getVar(scope, id) {
    return this.vars.get(scope)?.get(id);
  }

  memOf(nodeId, key, init) {
    if (!this.mem.has(nodeId)) this.mem.set(nodeId, new Map());
    const m = this.mem.get(nodeId);
    if (!m.has(key)) m.set(key, init());
    return m.get(key);
  }

  schedule(dtMs, kind, nodeId, pin, payload = {}) {
    const t = this.time + dtMs;
    const event = { t, kind, nodeId, pin, payload, id: nextId() };
    const i = this.queue.findIndex((e) => e.t > t);
    if (i < 0) this.queue.push(event);
    else this.queue.splice(i, 0, event);
    return event;
  }

  inject(kind, nodeId, pin = 'input', payload = {}) {
    return this.dispatch({ t: this.time, kind, nodeId, pin, payload, id: nextId() });
  }

  dispatch(event) {
    const fired = [];
    const actions = [];
    const node = this.byId.get(event.nodeId);
    if (!node) {
      this.logLine('warn', event.nodeId, '事件目标节点不存在,已忽略');
      this.trace.push({ t: event.t, event, fired, actions });
      return { fired, actions };
    }
    const result = nodes.processNode(this, node, event) ?? {};
    for (const f of result.fired ?? []) fired.push(f);
    for (const a of result.actions ?? []) actions.push(a);
    this.trace.push({ t: event.t, event, fired, actions });
    return { fired, actions };
  }

  step() {
    if (this.queue.length === 0) return null;
    const event = this.queue.shift();
    if (event.t > this.time) this.time = event.t;
    const out = this.dispatch(event);
    return { t: event.t, event, ...out };
  }

  advanceTime(ms) {
    const target = this.time + ms;
    let last = null;
    while (this.queue.length && this.queue[0].t <= target) {
      last = this.step();
    }
    this.time = Math.max(this.time, target);
    return last;
  }

  onStateChanged(did, siid, piid) {
    for (const n of this.nodes) {
      if (['logicAnd', 'logicOr', 'logicNot', 'statusLast', 'varChange', 'timeRange', 'deviceInput'].includes(n.type)) {
        nodes.onState(this, n, { did, siid, piid });
      }
    }
  }

  onVarChanged(scope, id) {
    for (const n of this.nodes) {
      if (['varChange', 'varGet', 'logicAnd', 'logicOr', 'logicNot', 'statusLast', 'condition', 'deviceInput'].includes(n.type)) {
        nodes.onState(this, n, { scope, id });
      }
    }
  }
}

export { pinType };
