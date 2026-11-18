const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const O = WebSocket;
    window.__WS__ = [];
    const P = new Proxy(O, {
      construct(t, a, n) {
        const ws = Reflect.construct(t, a, n);
        try { window.__WS__.push({ url: String(a[0]), ws }); } catch (e) {}
        return ws;
      }
    });
    Object.defineProperty(window, 'WebSocket', { value: P, configurable: true, writable: true });
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  const dialogs = [];
  try {
    client.page.on('dialog', async (d) => {
      const info = { type: d.type(), message: d.message(), defaultValue: d.defaultValue && d.defaultValue() };
      dialogs.push(info);
      console.log('DIALOG', JSON.stringify(info));
      try { await d.dismiss(); } catch (e) { console.log('dismiss err', e.message); }
    });
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 8000));
    const urls = await client.evaluate('JSON.stringify((window.__WS__||[]).map(x=>x.url))').catch(e => 'ERR ' + e.message);
    console.log('ws', urls);
    const closeRes = await client.evaluate(`(() => {
      const list = (window.__WS__||[]).filter(x => x.url.indexOf('matchmaking') >= 0 || x.url.indexOf('party') >= 0);
      list.forEach(x => { try { x.ws.close(0xfad, 'test'); } catch (e) {} });
      return JSON.stringify({ closed: list.length });
    })()`).catch(e => 'ERR ' + e.message);
    console.log('close', closeRes);
    await new Promise(r => setTimeout(r, 2500));
    console.log('dialogs so far', JSON.stringify(dialogs));
    const state = await Promise.race([
      client.evaluate('JSON.stringify({title:document.title, canvases:document.querySelectorAll("canvas").length, text:(document.body.innerText||"").slice(0,200)})'),
      new Promise(r => setTimeout(() => r('STATE TIMEOUT (renderer blocked)'), 6000))
    ]).catch(e => 'ERR ' + e.message);
    console.log('state', state);
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
