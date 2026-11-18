const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  let base = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');
  base = 'window.__O__=o;window.__N__=n;window.__T__=translate;\n' + base;
  // save debug source
  fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/debug-base.js', base, 'utf8');

  const init = `window.__PATCH_SRC__ = ${JSON.stringify(base)};\n(` + function () {
    try {
      const Orig = Function;
      const P = new Proxy(Orig, {
        construct(t, a, n) {
          try {
            if (a.length === 45 && String(a[a.length - 1]).length > 5000000 && window.__PATCH_SRC__) {
              a = a.slice(0, -1).concat([window.__PATCH_SRC__]);
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
    await new Promise(r => setTimeout(r, 12000));
    const r = await client.evaluate(`(() => {
      try {
        const a = window.__N__ ? window.__N__() : null;
        const msg = 'Please disable your browser extensions in order to play this game';
        const idx = a ? a.indexOf(msg) : -1;
        return JSON.stringify({
          hasO: !!window.__O__, hasN: !!window.__N__, hasT: !!window.__T__,
          len: a && a.length, idx,
          at: idx >= 0 ? window.__O__(idx + 0xaf) : null,
          literal: idx >= 0 ? '0x' + (idx + 0xaf).toString(16) : null,
          trans: window.__T__ ? window.__T__(msg) : null,
          tsrc: window.__T__ ? String(window.__T__).slice(0, 200) : null
        });
      } catch (e) { return 'ERR ' + e; }
    })()`).catch(e => String(e));
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
