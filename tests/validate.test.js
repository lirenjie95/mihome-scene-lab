import { validateNode, validateRule } from '../src/simulate/validate.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeBackup } from '../src/parse.js';

const here = dirname(fileURLToPath(import.meta.url));

const node = (type, props = {}, extra = {}) => ({
  id: 'n1',
  type,
  cfg: { pos: {} },
  inputs: extra.inputs ?? { input: null },
  outputs: extra.outputs ?? {},
  props,
});

export const tests = [
  {
    name: 'between 缺少 v2 报错',
    fn() {
      const issues = validateNode(node('deviceGet', { did: 'd1', siid: 3, piid: 1, dtype: 'float', operator: 'between', v1: 24 }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('v2'))) throw new Error(`缺 v2 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'float 使用 eq 报错(仅允许 > < between)',
    fn() {
      const issues = validateNode(node('deviceGet', { did: 'd1', siid: 3, piid: 1, dtype: 'float', operator: '=', v1: 24 }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('不允许运算符'))) throw new Error(`缺运算符报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'dtype 为 bool 报错(应使用 boolean)',
    fn() {
      const issues = validateNode(node('deviceGet', { did: 'd1', siid: 3, piid: 1, dtype: 'bool', operator: '=', v1: true }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('boolean'))) throw new Error(`缺 bool 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'include 的 v1 非数组报错',
    fn() {
      const issues = validateNode(node('deviceGet', { did: 'd1', siid: 3, piid: 1, dtype: 'int', operator: 'include', v1: 3 }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('数组'))) throw new Error(`缺 include 数组报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'deviceOutput 缺 value 且缺 scope+id 报错',
    fn() {
      const issues = validateNode(node('deviceOutput', { did: 'd1', siid: 2, piid: 1 }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('value'))) throw new Error(`缺 value 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'deviceOutput 动作模式缺 aiid 报错',
    fn() {
      const issues = validateNode(node('deviceOutput', { did: 'd1', siid: 7, ins: [{ piid: 1, value: 'x' }] }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('aiid'))) throw new Error(`缺 aiid 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'counter 的 n 小于 1 报错',
    fn() {
      const issues = validateNode(node('counter', { n: 0 }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('n'))) throw new Error(`缺 n 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'delay 缺 timeout 报错',
    fn() {
      const issues = validateNode(node('delay', {}));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('timeout'))) throw new Error(`缺 timeout 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'statusLast 的 timeout 为 0 报错',
    fn() {
      const issues = validateNode(node('statusLast', { timeout: 0 }));
      if (!issues.some((i) => i.level === 'error' && i.text.includes('大于 0'))) throw new Error(`缺 timeout>0 报错: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: '合法节点零 issue',
    fn() {
      const cases = [
        node('deviceGet', { did: 'd1', siid: 3, piid: 1, dtype: 'float', operator: '>', v1: 24 }),
        node('deviceOutput', { did: 'd1', siid: 2, piid: 1, value: true }),
        node('delay', { timeout: 5000 }),
        node('varGet', { scope: 'R1', id: 'V1', varType: 'number', operator: '=', v1: 0 }),
        node('deviceInput', { did: 'd1', siid: 2, eiid: 1, arguments: [] }),
      ];
      for (const n of cases) {
        const issues = validateNode(n);
        if (issues.length !== 0) throw new Error(`${n.type} 应有 0 issue: ${JSON.stringify(issues)}`);
      }
    },
  },
  {
    name: 'validateRule 汇总所有节点问题',
    fn() {
      const issues = validateRule({
        nodes: [
          { ...node('delay', {}), id: 'a' },
          { ...node('counter', { n: 0 }), id: 'b' },
        ],
      });
      const ids = new Set(issues.map((i) => i.nodeId));
      if (!ids.has('a') || !ids.has('b')) throw new Error(`应覆盖全部节点: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: '脱敏回家场景校验零 error',
    async fn() {
      const bytes = new Uint8Array(readFileSync(join(here, 'fixtures', 'home-sanitized.bak')));
      const decoded = await decodeBackup(bytes);
      for (const rule of decoded.value.rules) {
        const issues = validateRule(rule).filter((i) => i.level === 'error');
        if (issues.length !== 0) throw new Error(`回家场景应有 0 error: ${JSON.stringify(issues)}`);
      }
    },
  },
];
