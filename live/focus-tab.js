const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.bringToFront');
    const win = await client.cdp.send('Browser.getWindowForTarget').catch(() => null);
    if (win && win.result) {
      await client.cdp.send('Browser.setWindowBounds', { windowId: win.result.windowId, bounds: { windowState: 'normal' } }).catch(() => {});
      await client.cdp.send('Browser.setWindowBounds', { windowId: win.result.windowId, bounds: { left: 0, top: 0, width: 1930, height: 1060, windowState: 'normal' } }).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 1500));
    const r = await client.evaluate(`JSON.stringify({
      vis: document.visibilityState, focus: document.hasFocus(),
      me: window.__g2.me && window.__g2.me.id,
      ents: window.__g2.w44i_2qp.length,
      types: Object.keys(window.__g2.types || {}),
      spectacle: window.__g2.spectating,
      frame: window.__g2.frame
    })`);
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
