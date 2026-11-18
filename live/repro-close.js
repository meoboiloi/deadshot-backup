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
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 8000));
    const pre = await client.evaluate(`JSON.stringify((window.__WS__||[]).map(x=>x.url))`).catch(e => String(e));
    console.log('ws', pre);
    const r = await client.evaluate(`(() => {
      const list = (window.__WS__||[]).filter(x => x.url.indexOf('matchmaking') >= 0 || x.url.indexOf('party') >= 0);
      list.forEach(x => { try { x.ws.close(0xfad, 'test'); } catch (e) {} });
      return JSON.stringify({ closed: list.length });
    })()`).catch(e => String(e));
    console.log('close', r);
    await new Promise(r => setTimeout(r, 1200));
    const body = await client.evaluate(`JSON.stringify({ text: (document.body.innerText||'').slice(0,600), html: document.body.innerHTML.length, canvases: document.querySelectorAll('canvas').length })`).catch(e => String(e));
    console.log('body', body);
  } finally { await client.disconnect().catch(() => {}); }
})();
