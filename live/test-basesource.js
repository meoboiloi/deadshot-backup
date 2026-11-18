const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const base = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');
  console.log('base len', base.length);
  const init = `window.__BASE_SRC__ = ${JSON.stringify(base)};\n(` + function () {
    try {
      const Orig = Function;
      const P = new Proxy(Orig, {
        construct(t, a, n) {
          try {
            const s = a.length ? String(a[a.length - 1]) : '';
            if (a.length === 45 && s.length > 5000000 && window.__BASE_SRC__) {
              window.__REPLACED__ = true;
              a = a.slice(0, -1).concat([window.__BASE_SRC__]);
            }
          } catch (e) {}
          return Reflect.construct(t, a, n);
        },
        apply(t, th, a) { return Reflect.apply(t, th, a); }
      });
      Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
    } catch (e) {}
  }.toString() + ')();';

  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: init });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 15000));
    const st = await client.evaluate(`JSON.stringify({baseLen: window.__BASE_SRC__ && window.__BASE_SRC__.length, replaced: !!window.__REPLACED__, canvases: document.querySelectorAll('canvas').length, title: document.title, bodyText: (document.body.innerText||'').slice(0,60)})`).catch(e => String(e));
    console.log(st);
  } finally { await client.disconnect().catch(() => {}); }
})();
