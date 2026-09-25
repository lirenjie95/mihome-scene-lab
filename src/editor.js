// JSON 编辑器核心:场景模板与导出文本(纯函数,Node 可测)
export function newSceneTemplate() {
  const id = String(Date.now());
  const now = Date.now();
  return {
    version: 2,
    rules: [
      {
        id,
        cfg: {
          id,
          enable: false,
          uiType: 'test',
          userData: {
            name: '新建场景',
            transform: { x: 0, y: 0, scale: 1, rotate: 0 },
            lastUpdateTime: now,
            version: 0,
          },
        },
        nodes: [
          {
            id: 'src1',
            type: 'deviceInput',
            cfg: { name: 'deviceInput', version: 0, pos: { x: 0, y: 0, width: 220, height: 110 }, urn: '' },
            inputs: { input: null },
            outputs: { output: ['act1.trigger'] },
            props: {
              did: '<设备DID>',
              siid: 2,
              eiid: 1,
              arguments: [{ dtype: 'string', piid: 1, operator: '=', v1: '<触发词>' }],
            },
          },
          {
            id: 'act1',
            type: 'deviceOutput',
            cfg: { name: 'deviceOutput', version: 0, pos: { x: 300, y: 0, width: 220, height: 110 }, urn: '' },
            inputs: { trigger: null },
            outputs: { output: [] },
            props: { did: '<设备DID>', siid: 2, piid: 1, value: true },
          },
        ],
      },
    ],
    variables: {},
  };
}

export function payloadToText(payload) {
  return JSON.stringify(payload, null, 2);
}

export function textToPayload(text) {
  const value = JSON.parse(text);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    if (Array.isArray(value)) return value; // legacy rules-only 数组也允许
    throw new Error('顶层必须是对象或数组');
  }
  return value;
}
