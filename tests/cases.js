// 浏览器自测:复用与 Node 相同的 .test.js 模块
import * as parse from './parse.test.js';
import * as model from './model.test.js';
import * as devices from './devices.test.js';
import * as pins from './pins.test.js';
import * as layout from './layout.test.js';
import * as render from './render.test.js';
import * as summary from './summary.test.js';
import * as sanitize from './sanitize.test.js';

export async function runAll() {
  const all = [parse, model, devices, pins, layout, render, summary, sanitize];
  const results = [];
  for (const mod of all) {
    for (const t of mod.tests ?? []) {
      try {
        await t.fn();
        results.push({ name: t.name, ok: true });
      } catch (e) {
        results.push({ name: t.name, ok: false, error: e });
      }
    }
  }
  return results;
}
