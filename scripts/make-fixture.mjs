import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeFile } from '../src/sanitize.js';

const input = process.argv[2];
if (!input) {
  console.error('用法: node scripts/make-fixture.mjs <原始.bak 路径>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(root, 'tests', 'fixtures');
mkdirSync(fixtures, { recursive: true });

const bytes = new Uint8Array(readFileSync(input));
const { bytes: clean, map, value } = await sanitizeFile(bytes);

writeFileSync(join(fixtures, 'home-sanitized.bak'), clean);
writeFileSync(join(fixtures, 'home-sanitized.json'), JSON.stringify(value, null, 2), 'utf8');
console.log('替换映射:');
console.log(JSON.stringify(map, null, 2));
console.log(`已写出 tests/fixtures/home-sanitized.bak (${clean.length} 字节)`);
