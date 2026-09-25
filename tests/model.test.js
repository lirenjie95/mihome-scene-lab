import { normalizePayload } from '../src/model.js';

export const tests = [
  {
    name: 'v2 对象原样通过,version/rules/variables 保留',
    fn() {
      const input = { version: 2, rules: [{ id: 'r1', cfg: {} }], variables: { S: { V: {} } } };
      const out = normalizePayload(input);
      if (out.version !== 2) throw new Error('version 丢失');
      if (out.rules.length !== 1 || out.rules[0].id !== 'r1') throw new Error('rules 丢失');
      if (out.variables.S.V === undefined) throw new Error('variables 丢失');
      if (out.warnings.length !== 0) throw new Error(`不应有警告: ${out.warnings}`);
    },
  },
  {
    name: 'legacy rules-only 数组规范化为 v2,并生成警告',
    fn() {
      const out = normalizePayload([{ id: 'a' }, { cfg: { id: 'b' } }]);
      if (out.version !== 2) throw new Error('version 应为 2');
      if (out.rules.length !== 2) throw new Error('规则数不符');
      if (out.rules[1].id !== 'b') throw new Error('应从 cfg.id 补 id');
      if (out.variables.S !== undefined && Object.keys(out.variables).length !== 0) {
        throw new Error('legacy 无变量');
      }
      if (out.warnings.length !== 1 || !out.warnings[0].includes('旧版')) throw new Error('应有一条旧版警告');
    },
  },
  {
    name: '规则缺 id 与 cfg.id 时给警告但不丢弃',
    fn() {
      const out = normalizePayload({ version: 2, rules: [{ nodes: [] }, { id: 'ok', nodes: [] }] });
      if (out.rules.length !== 2) throw new Error('规则不应被丢弃');
      if (!out.warnings.some((w) => w.includes('缺少 id'))) throw new Error('应警告缺少 id');
    },
  },
  {
    name: '非对象规则条目被跳过并警告',
    fn() {
      const out = normalizePayload({ version: 2, rules: [42, { id: 'ok' }] });
      if (out.rules.length !== 1 || out.rules[0].id !== 'ok') throw new Error('应跳过 42');
      if (!out.warnings.some((w) => w.includes('非对象'))) throw new Error('应警告非对象条目');
    },
  },
  {
    name: '顶层既不是对象也不是数组时抛错',
    fn() {
      try {
        normalizePayload('text');
        throw new Error('应抛出');
      } catch (e) {
        if (!String(e.message).includes('对象')) throw e;
      }
    },
  },
  {
    name: 'version 缺省时补 2',
    fn() {
      const out = normalizePayload({ rules: [], variables: {} });
      if (out.version !== 2) throw new Error('version 应补 2');
    },
  },
];
