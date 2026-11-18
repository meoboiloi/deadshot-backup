const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    const frames = client.page.frames();
    const out = [];
    for (const f of frames) {
      let r;
      try {
        r = await f.evaluate(() => {
          const cs = [...document.querySelectorAll('canvas')];
          const big = cs.map(c => ({ w: c.width, h: c.height, css: c.getBoundingClientRect().width | 0 })).sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
          return {
            href: location.href,
            canvases: cs.length,
            big,
            g2: !!window.__g2,
            g2ents: window.__g2 && window.__g2.w44i_2qp ? window.__g2.w44i_2qp.length : null,
            g2me: window.__g2 && window.__g2.me ? window.__g2.me.id : null,
            three: !!window.rwJ2_319,
            html: document.documentElement ? document.documentElement.outerHTML.slice(0, 120) : ''
          };
        });
      } catch (e) { r = { err: String(e).slice(0, 100) }; }
      out.push({ url: f.url().slice(0, 90), name: f.name(), r });
    }
    console.log(JSON.stringify(out, null, 1));
  } finally { await client.disconnect().catch(() => {}); }
})();
