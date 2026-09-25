import { decodeBackup, packBackup } from './parse.js';

const FIXED_TS = 1700000000000;

export function sanitizePayload(value) {
  const map = new Map();
  let numSeq = 0;
  let bltSeq = 0;
  const fakeDid = (did) => {
    if (map.has(did)) return map.get(did);
    let fake;
    if (/^blt\./.test(did)) {
      bltSeq += 1;
      fake = `blt.3.1fake${String(bltSeq).padStart(6, '0')}`;
    } else {
      numSeq += 1;
      fake = String(1000000000 + numSeq);
    }
    map.set(did, fake);
    return fake;
  };
  const walk = (x) => {
    if (Array.isArray(x)) {
      for (let i = 0; i < x.length; i += 1) x[i] = walk(x[i]);
      return x;
    }
    if (x && typeof x === 'object') {
      for (const k of Object.keys(x)) {
        if (k === 'did' && typeof x[k] === 'string') {
          x[k] = fakeDid(x[k]);
        } else if ((k === 'latitude' || k === 'longitude') && typeof x[k] === 'number') {
          x[k] = 0;
        } else if ((k === 'lastUpdateTime' || k === 'ts') && typeof x[k] === 'number') {
          x[k] = FIXED_TS;
        } else {
          x[k] = walk(x[k]);
        }
      }
      return x;
    }
    return x;
  };
  const clean = walk(structuredClone(value));
  return { value: clean, map: Object.fromEntries(map) };
}

export async function sanitizeFile(bytes) {
  const decoded = await decodeBackup(bytes);
  const { value: clean, map } = sanitizePayload(decoded.value);
  const packed = await packBackup(JSON.stringify(clean));
  return { bytes: packed, map, value: clean };
}
