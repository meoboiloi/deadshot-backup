const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const src = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/patched-nodetect.js', 'utf8');

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
})();
window.__PATCH_SRC__ = ${JSON.stringify(src)};
(` + function () {
  const Orig = Function;
  const P = new Proxy(Orig, {
    construct(t, a, n) {
      try { if (a.length === 45 && String(a[a.length - 1]).length > 5000000 && window.__PATCH_SRC__) a = a.slice(0, -1).concat([window.__PATCH_SRC__]); } catch (e) {}
      return Reflect.construct(t, a, n);
    },
    apply(t, th, a) { return Reflect.apply(t, th, a); }
  });
  Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
}.toString() + ')();';

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  const dialogs = [];
  try {
    client.page.on('dialog', async d => { dialogs.push({ type: d.type(), message: d.message() }); console.log('DIALOG', d.message()); try { await d.dismiss(); } catch (e) {} });
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 10000));
    console.log('dialogs', JSON.stringify(dialogs));
    console.log('state', await client.evaluate('JSON.stringify({title:document.title, canvases:document.querySelectorAll("canvas").length, ws:(window.__WS__||[]).map(x=>x.url)})').catch(e => 'ERR ' + e.message));
  } finally { await client.disconnect().catch(() => {}); }
})();
