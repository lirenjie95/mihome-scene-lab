import { sanitizePayload, sanitizeFile } from '../src/sanitize.js';
import { packBackup, decodeBackup } from '../src/parse.js';

const sample = () => ({
  version: 2,
  rules: [
    {
      cfg: { userData: { name: '回家', lastUpdateTime: 1790306036485 }, enable: true },
      nodes: [
        { id: 'a', type: 'deviceGet', props: { did: 'blt.3.1pgd9rk2h0o00', siid: 3, piid: 1001 } },
        { id: 'b', type: 'deviceOutput', props: { did: '1143942225', siid: 2, piid: 1 } },
        { id: 'c', type: 'alarmClock', props: { latitude: 31.039133, longitude: 119.434313, ts: 1790306036485 } },
      ],
    },
  ],
  variables: {},
});

export const tests = [
  {
    name: 'DID 按首次出现顺序确定性替换',
    fn() {
      const { value, map } = sanitizePayload(sample());
      const dids = value.rules[0].nodes.map((n) => n.props.did);
      if (dids[0] !== 'blt.3.1fake000001') throw new Error(`blt 映射: ${dids[0]}`);
      if (dids[1] !== '1000000001') throw new Error(`数字 did 映射: ${dids[1]}`);
      if (map['1143942225'] !== '1000000001') throw new Error('map 记录错误');
    },
  },
  {
    name: '两次运行输出一致(可复现)',
    fn() {
      const a = JSON.stringify(sanitizePayload(sample()).value);
      const b = JSON.stringify(sanitizePayload(sample()).value);
      if (a !== b) throw new Error('输出不一致');
    },
  },
  {
    name: '经纬度归零、时间戳固定',
    fn() {
      const { value } = sanitizePayload(sample());
      const c = value.rules[0].nodes[2].props;
      if (c.latitude !== 0 || c.longitude !== 0) throw new Error('经纬度未归零');
      if (c.ts !== 1700000000000) throw new Error('ts 未固定');
      if (value.rules[0].cfg.userData.lastUpdateTime !== 1700000000000) throw new Error('lastUpdateTime 未固定');
    },
  },
  {
    name: 'sanitizeFile 往返:输出可重新解析且内容已脱敏',
    async fn() {
      const packed = await packBackup(JSON.stringify(sample()));
      const { bytes, map } = await sanitizeFile(packed);
      const decoded = await decodeBackup(bytes);
      if (!decoded.verified) throw new Error('回打包应有有效摘要');
      if (decoded.value.rules[0].nodes[1].props.did !== '1000000001') throw new Error('回包内容未脱敏');
      if (Object.keys(map).length !== 2) throw new Error(`map 应有 2 项,得到 ${JSON.stringify(map)}`);
    },
  },
];
