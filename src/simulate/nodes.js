import { getChoice } from './assumptions.js';

const cmp = (a, op, b) => {
  switch (op) {
    case '=': return a === b;
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '!=': return a !== b;
    default: return false;
  }
};

// 事件向某个输出引脚发射:沿 outputs[pin] 端点派发到下游节点输入
export function fire(eng, node, pin, text) {
  const fired = [{ nodeId: node.id, pin, text }];
  eng.logLine('event', node.id, `${node.type} 输出 ${pin}${text ? `(${text})` : ''}`);
  const targets = node.outputs?.[pin] ?? [];
  for (const t of targets) {
    const dot = t.lastIndexOf('.');
    const to = dot >= 0 ? t.slice(0, dot) : t;
    const toPin = dot >= 0 ? t.slice(dot + 1) : 'input';
    const next = eng.byId.get(to);
    if (!next) continue;
    eng.dispatch({ t: eng.time, kind: 'internal', nodeId: to, pin: toPin, payload: { from: node.id, fromPin: pin } });
  }
  return fired;
}

export function evalCondition(eng, node) {
  const source = findSource(eng, node.id, 'condition');
  if (!source) {
    const choice = getChoice('condition-empty');
    eng.logLine('assume', node.id, `condition 未接状态,按假设「${choice}」`);
    return choice === 'met';
  }
  return evalState(eng, source);
}

export function evalState(eng, node) {
  const p = node.props ?? {};
  switch (node.type) {
    case 'deviceInput': {
      if (p.eiid !== undefined) return false;
      const v = eng.getDevice(p.did, p.siid, p.piid);
      return cmp(v, p.operator ?? '=', p.v1);
    }
    case 'varChange': {
      const v = eng.getVar(p.scope ?? 'global', p.id);
      return cmp(v, p.operator ?? '=', p.v1);
    }
    case 'timeRange': {
      return Boolean(eng.memOf(node.id, 'inRange', () => false));
    }
    case 'register': {
      return Boolean(eng.memOf(node.id, 'latch', () => getChoice('register-persist') === 'true'));
    }
    case 'logicNot': {
      const src = findSource(eng, node.id, 'input');
      return src ? !evalState(eng, src) : false;
    }
    case 'logicAnd': {
      const srcs = findSources(eng, node.id, 'input');
      return srcs.length > 0 && srcs.every((s) => evalState(eng, s));
    }
    case 'logicOr': {
      const srcs = findSources(eng, node.id, 'input');
      return srcs.some((s) => evalState(eng, s));
    }
    default:
      return false;
  }
}

function findSource(eng, targetId, pin) {
  for (const n of eng.nodes) {
    for (const targets of Object.values(n.outputs ?? {})) {
      if ((targets ?? []).includes(`${targetId}.${pin}`)) return n;
    }
  }
  return null;
}

function findSources(eng, targetId, pin) {
  const out = [];
  for (const n of eng.nodes) {
    for (const targets of Object.values(n.outputs ?? {})) {
      if ((targets ?? []).includes(`${targetId}.${pin}`)) out.push(n);
    }
  }
  return out;
}

export function processNode(eng, node, event) {
  switch (node.type) {
    case 'deviceInput':
    case 'deviceInputSetVar':
    case 'alarmClock':
    case 'onLoad':
    case 'varChange': {
      return { fired: fire(eng, node, 'output', '触发') };
    }
    case 'timeRange': {
      return { fired: fire(eng, node, 'output', '窗口进入') };
    }
    case 'deviceGet': {
      const p = node.props ?? {};
      const v = eng.getDevice(p.did, p.siid, p.piid);
      const ok = cmp(v, p.operator ?? '=', p.v1);
      const pin = ok ? 'output' : 'output2';
      eng.logLine('query', node.id, `查询 ${p.did} siid=${p.siid} piid=${p.piid} = ${JSON.stringify(v)},${ok ? '满足' : '不满足'}`);
      return { fired: fire(eng, node, pin, ok ? '满足' : '不满足') };
    }
    case 'varGet': {
      const p = node.props ?? {};
      const v = eng.getVar(p.scope ?? 'global', p.id);
      const ok = cmp(v, p.operator ?? '=', p.v1);
      const pin = ok ? 'output' : 'output2';
      eng.logLine('query', node.id, `查询变量 ${p.id} = ${JSON.stringify(v)},${ok ? '满足' : '不满足'}`);
      return { fired: fire(eng, node, pin, ok ? '满足' : '不满足') };
    }
    case 'condition': {
      const ok = evalCondition(eng, node);
      const pin = ok ? 'met' : 'unmet';
      return { fired: fire(eng, node, pin, ok ? 'met' : 'unmet') };
    }
    case 'signalOr': {
      return { fired: fire(eng, node, 'output', '任一输入') };
    }
    case 'delay': {
      if (event.pin === 'timer') {
        return { fired: fire(eng, node, 'output', '延时到期') };
      }
      const p = node.props ?? {};
      const timeout = p.timeout ?? 0;
      if (getChoice('delay-repeat') === 'restart') {
        const pending = eng.memOf(node.id, 'pending', () => null);
        if (pending && pending.t > eng.time) {
          const i = eng.queue.indexOf(pending);
          if (i >= 0) eng.queue.splice(i, 1);
        }
      }
      eng.memOf(node.id, 'pending', () => null);
      const ev = eng.schedule(timeout, 'internal', node.id, 'timer', {});
      eng.mem.get(node.id).set('pending', ev);
      eng.logLine('timer', node.id, `延时 ${timeout}ms 后输出`);
      return { fired: [] };
    }
    case 'loop': {
      if (event.pin === 'stop') return { fired: [] };
      const interval = node.props?.interval ?? 1000;
      if (event.pin === 'tick') {
        const out = fire(eng, node, 'output', '循环 tick');
        eng.schedule(interval, 'internal', node.id, 'tick', {});
        return { fired: out };
      }
      const dt = getChoice('loop-first-tick') === 'immediate' ? 0 : interval;
      eng.schedule(dt, 'internal', node.id, 'tick', {});
      return { fired: [] };
    }
    case 'eventSequence': {
      const m = eng.memOf(node.id, 'seq', () => ({ first: null }));
      if (event.pin === 'input1') {
        m.first = eng.time;
        eng.logLine('seq', node.id, '记录第一事件');
        return { fired: [] };
      }
      if (event.pin === 'input2' && m.first !== null) {
        const timeout = node.props?.timeout ?? 60000;
        if (eng.time - m.first <= timeout) {
          m.first = null;
          return { fired: fire(eng, node, 'output', '顺序成立') };
        }
      }
      return { fired: [] };
    }
    case 'onlyNTimes': {
      const n = node.props?.n ?? 1;
      if (event.pin === 'zero') {
        eng.mem.get(node.id)?.set('count', 0);
        return { fired: [] };
      }
      const count = eng.memOf(node.id, 'count', () => 0);
      if (count < n) {
        eng.mem.get(node.id).set('count', count + 1);
        return { fired: fire(eng, node, 'output', `第 ${count + 1} 次放行`) };
      }
      return { fired: [] };
    }
    case 'counter': {
      const threshold = node.props?.threshold ?? 1;
      if (event.pin === 'zero') {
        eng.mem.get(node.id)?.set('count', 0);
        return { fired: [] };
      }
      const count = eng.memOf(node.id, 'count', () => 0);
      const next = count + 1;
      eng.mem.get(node.id).set('count', next);
      if (getChoice('counter-edge') === 'at-n-reset') eng.mem.get(node.id).set('count', 0);
      if (next >= threshold) {
        return { fired: fire(eng, node, 'output', `达到 ${threshold} 次`) };
      }
      return { fired: [] };
    }
    case 'register': {
      if (event.pin === 'setTrue') {
        eng.memOf(node.id, 'latch', () => false);
        eng.mem.get(node.id).set('latch', true);
      } else if (event.pin === 'setFalse') {
        eng.memOf(node.id, 'latch', () => false);
        eng.mem.get(node.id).set('latch', false);
      } else {
        eng.memOf(node.id, 'latch', () => false);
        const v = eng.mem.get(node.id).get('latch');
        return { fired: fire(eng, node, 'output', `latch=${v}`) };
      }
      return { fired: [] };
    }
    case 'modeSwitch': {
      const idx = eng.memOf(node.id, 'idx', () => 0);
      const pin = `output${idx}`;
      eng.mem.get(node.id).set('idx', (idx + 1) % 4);
      return { fired: fire(eng, node, pin, `轮转到 ${pin}`) };
    }
    case 'deviceOutput': {
      const p = node.props ?? {};
      if (Array.isArray(p.ins) && p.ins.length > 0) {
        const text = `执行: ${p.ins.map((i) => i.value ?? JSON.stringify(i)).join('; ')}`;
        eng.logLine('action', node.id, text);
        return { fired: fire(eng, node, 'output', '已执行'), actions: [{ nodeId: node.id, text }] };
      }
      eng.setDevice(p.did, p.siid, p.piid, p.value);
      const a = { nodeId: node.id, text: `执行: 设备 ${p.did} siid=${p.siid} piid=${p.piid} ← ${JSON.stringify(p.value)}` };
      eng.logLine('action', node.id, a.text);
      return { fired: fire(eng, node, 'output', '已执行'), actions: [a] };
    }
    case 'deviceGetSetVar': {
      const p = node.props ?? {};
      const v = eng.getDevice(p.did, p.siid, p.piid);
      eng.setVar(p.scope ?? 'global', p.id, v);
      return { fired: fire(eng, node, 'output', `变量 ← ${JSON.stringify(v)}`) };
    }
    case 'varSetNumber':
    case 'varSetString': {
      const p = node.props ?? {};
      let v;
      if (p.elements?.[0]?.type === 'const') {
        v = node.type === 'varSetNumber' ? Number(p.elements[0].value) : p.elements[0].value;
      } else {
        v = p.value;
      }
      eng.setVar(p.scope ?? 'global', p.id, v);
      return { fired: fire(eng, node, 'output', `变量 ← ${JSON.stringify(v)}`) };
    }
    case 'statusLast': {
      if (event.pin === 'timer') {
        return { fired: fire(eng, node, 'output', '保持时长满足') };
      }
      return { fired: [] };
    }
    case 'logicAnd':
    case 'logicOr':
    case 'logicNot': {
      return { fired: [] };
    }
    default: {
      return { fired: fire(eng, node, 'output', '未知类型透传') };
    }
  }
}

export function onState(eng, node) {
  switch (node.type) {
    case 'logicAnd':
    case 'logicOr':
    case 'logicNot': {
      const v = evalState(eng, node);
      const prev = eng.memOf(node.id, 'prev', () => null);
      if (prev !== v) {
        eng.mem.get(node.id).set('prev', v);
        eng.logLine('state', node.id, `${node.type} 求值 → ${v}`);
        fire(eng, node, 'output', `状态 → ${v}`);
      }
      return;
    }
    case 'statusLast': {
      const v = evalState(eng, node);
      const started = eng.memOf(node.id, 'started', () => null);
      if (v && started === null) {
        eng.mem.get(node.id).set('started', eng.time);
        const dur = node.props?.duration ?? node.props?.timeout ?? 1000;
        eng.schedule(dur, 'internal', node.id, 'timer', {});
        eng.logLine('timer', node.id, `开始保持计时 ${dur}ms`);
      } else if (!v && started !== null) {
        if (getChoice('statuslast-false') === 'cancel') {
          eng.mem.get(node.id).set('started', null);
          eng.logLine('timer', node.id, 'false 取消保持计时');
        }
      }
      return;
    }
    case 'varChange': {
      const v = evalState(eng, node);
      const prev = eng.memOf(node.id, 'prev', () => null);
      if (prev !== v) {
        eng.mem.get(node.id).set('prev', v);
        eng.logLine('state', node.id, `varChange 状态 → ${v}`);
        fire(eng, node, 'output', `状态 → ${v}`);
      }
      return;
    }
    case 'deviceInput': {
      if ((node.props ?? {}).eiid === undefined) {
        const v = evalState(eng, node);
        const prev = eng.memOf(node.id, 'prev', () => null);
        if (prev !== v) {
          eng.mem.get(node.id).set('prev', v);
          eng.logLine('state', node.id, `属性模式状态 → ${v}`);
          fire(eng, node, 'output', `状态 → ${v}`);
        }
      }
      return;
    }
    default:
      return;
  }
}
