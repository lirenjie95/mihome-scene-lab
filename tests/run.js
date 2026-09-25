import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.test.js'));

let passed = 0;
const failures = [];
for (const file of files) {
  const mod = await import(pathToFileURL(join(here, file)).href);
  for (const t of mod.tests ?? []) {
    try {
      await t.fn();
      passed += 1;
      console.log(`ok   ${file} :: ${t.name}`);
    } catch (err) {
      failures.push(`${file} :: ${t.name}\n    ${err?.stack ?? err}`);
      console.log(`FAIL ${file} :: ${t.name}`);
    }
  }
}
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
