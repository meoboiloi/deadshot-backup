const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    const r = await client.evaluate(`(() => {
      const g = window.__g2;
      const r0 = g['іlӏIΙӏιІ'][0];
      const isVec = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && Object.values(v).every(n => typeof n === 'number');
      const renderer = { ratio: r0.ratio, w: r0.c.width, h: r0.c.height, vecs: {}, nums: {}, others: [] };
      for (const [k, v] of Object.entries(r0)) {
        if (typeof v === 'number') renderer.nums[k] = v;
        else if (isVec(v)) renderer.vecs[k] = { ...v };
        else if (v && typeof v === 'object') renderer.others.push([k, Array.isArray(v) ? 'array' : 'object']);
      }
      const scenes = g.scenes.map((s, i) => {
        let tr = null;
        for (const [k, v] of Object.entries(s)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.ratio === 'number' && Object.values(v).some(x => isVec(x))) tr = { key: k, v: { posKey: Object.keys(v).find(p => isVec(v[p])), ratio: v.ratio, angleKey: Object.keys(v).find(p => typeof v[p] === 'number' && p !== 'ratio') } };
        }
        return { i, type: s.type, size: s.size, children: (s.w44i_2qp || []).length, objs: (s['іlӏIΙӏιІ'] || []).length, tr };
      });
      return JSON.stringify({ renderer, scenes: scenes.filter(s => s.type || s.children || s.tr) }, null, 1);
    })()`).catch(e => 'ERR ' + e.message);
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
