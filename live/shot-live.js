const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.bringToFront');
    const shot = await client.cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/shot-live.png', Buffer.from(shot.data, 'base64'));
    const r = await client.evaluate(`(() => {
      const g = window.__g2;
      const rs = g['іΙıӏlΙΙі'] || [];
      const r0 = rs[0];
      return JSON.stringify({
        renderers: rs.length,
        canvas: r0 && r0.c ? { w: r0.c.width, h: r0.c.height, connected: r0.c.isConnected, cssW: r0.c.style.width, parent: r0.c.parentElement && r0.c.parentElement.tagName } : null,
        bodyCanvasIds: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height),
        me: g.me && g.me.id,
        ents: g.w44i_2qp && g.w44i_2qp.length,
        perf: performance.now() | 0
      });
    })()`).catch(e => 'ERR ' + e.message);
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
