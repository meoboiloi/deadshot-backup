const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    const r = await client.evaluate(`(() => {
      const g = window.__g2;
      if (!g) return JSON.stringify({ err: 'no __g2' });
      const keys = Object.keys(g);
      const arrays = {};
      for (const k of keys) {
        const v = g[k];
        if (Array.isArray(v)) {
          arrays[k] = { len: v.length, firstKeys: v[0] && typeof v[0] === 'object' ? Object.keys(v[0]).slice(0, 20) : null, firstType: v[0] === undefined ? 'empty' : typeof v[0] };
        }
      }
      const tables = {};
      for (const k of keys) {
        const v = g[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const ks = Object.keys(v);
          const fns = ks.filter(x => typeof v[x] === 'function');
          if (ks.includes('e') && fns.length) tables[k] = { keys: ks, fns: fns.length };
        }
      }
      const renderers = [];
      for (const k of keys) {
        const v = g[k];
        if (Array.isArray(v)) v.forEach((o, i) => { if (o && typeof o === 'object' && typeof o.ratio === 'number' && o.c) renderers.push({ key: k, i, ratio: o.ratio, w: o.c.width, h: o.c.height, props: Object.keys(o) }); });
      }
      return JSON.stringify({ keys, arrays, tables, renderers, me: g.me ? g.me.id : null }, null, 1);
    })()`).catch(e => 'ERR ' + e.message);
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
