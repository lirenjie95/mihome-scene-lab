import { escapeHtml } from '../src/escape.js';
import { collectDeviceProps, deviceRowHtml } from '../src/simulate/ui.js';

const node = (id, type, props, outputs = {}) => ({
  id,
  type,
  cfg: { pos: {} },
  inputs: { input: null },
  outputs,
  props,
});

export const tests = [
  {
    name: 'escapeHtml 转义全部五种危险字符',
    fn() {
      const out = escapeHtml(`<img src=x onerror="alert('1')">&`);
      if (out.includes('<') || out.includes('>') || out.includes('"') || out.includes("'")) {
        throw new Error(`仍含未转义字符: ${out}`);
      }
      if (!out.includes('&lt;img')) throw new Error('缺少 &lt;img');
      if (!out.includes('&amp;')) throw new Error('缺少 &amp;');
      if (!out.includes('&#39;')) throw new Error('缺少 &#39;');
    },
  },
  {
    name: 'collectDeviceProps 去重收集场景内设备属性',
    fn() {
      const rule = {
        nodes: [
          node('a', 'deviceGet', { did: 'd1', siid: 3, piid: 1001 }),
          node('b', 'deviceGet', { did: 'd1', siid: 3, piid: 1001 }),
          node('c', 'deviceOutput', { did: 'd2', siid: 2, piid: 1, value: true }),
        ],
      };
      const props = collectDeviceProps(rule);
      if (props.length !== 2) throw new Error(`应去重为 2 项: ${JSON.stringify(props)}`);
      if (!props.some((p) => p.key === 'd1:3:1001') || !props.some((p) => p.key === 'd2:2:1')) {
        throw new Error('收集结果缺项');
      }
    },
  },
  {
    name: '恶意 DID 在设备行 HTML 中被转义',
    fn() {
      const evil = '<img src=x onerror=alert(1)>';
      const html = deviceRowHtml({ key: `${evil}:2:1`, did: evil, siid: 2, piid: 1, value: true }, true);
      if (html.includes('<img')) throw new Error(`XSS 未转义: ${html}`);
      if (!html.includes('&lt;img')) throw new Error('缺少转义后的 &lt;img');
    },
  },
  {
    name: '设备行布尔值渲染为 checkbox',
    fn() {
      const html = deviceRowHtml({ key: 'd1:2:1', did: 'd1', siid: 2, piid: 1, value: true }, true);
      if (!html.includes('type="checkbox"') || !html.includes('checked')) throw new Error(`应为勾选的 checkbox: ${html}`);
    },
  },
];
