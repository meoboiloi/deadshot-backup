const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.evaluate(`(() => {
      if (!window.__visSpoof) {
        window.__visSpoof = true;
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      }
      return document.visibilityState + '/' + document.hidden;
    })()`);

    const x = 960, y = 445;
    await client.cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
    await client.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await client.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 1200));

    const r = await client.evaluate(`JSON.stringify({
      vis: document.visibilityState,
      me: window.__g2.me && window.__g2.me.id,
      ents: window.__g2.w44i_2qp.length,
      types: Object.keys(window.__g2.types || {}),
      spect: window.__g2.spectating,
      frame: window.__g2.frame
    })`);
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
