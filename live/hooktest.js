const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const od = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (buf, opts) {
      let s = od.call(this, buf, opts);
      try {
        if (s.length > 5000000) {
          window.__BASE_LEN__ = s.length;
          if (s.indexOf('var battle_royale_enabled=false') >= 0) {
            s = s.replace('var battle_royale_enabled=false', 'var battle_royale_enabled=false;window.__PATCHED_BASE__=true;');
          }
        }
      } catch (e) {}
      return s;
    };
  } catch (e) {}
  try {
    const Orig = Function;
    const P = new Proxy(Orig, {
      construct(t, a, n) {
        try {
          const s = a.length ? String(a[a.length - 1]) : '';
          if (s.length > 5000000) {
            window.__FINAL_LEN__ = s.length;
            if (s.indexOf('var battle_royale_enabled=(!1)') >= 0) {
              a[a.length - 1] = s.replace('var battle_royale_enabled=(!1)', 'var battle_royale_enabled=(!1);window.__PATCHED_FINAL__=true;');
            }
          }
        } catch (e) {}
        return Reflect.construct(t, a, n);
      },
      apply(t, th, a) { return Reflect.apply(t, th, a); }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 12000));
    const st = await client.evaluate(`JSON.stringify({
      baseLen: window.__BASE_LEN__ || 0,
      finalLen: window.__FINAL_LEN__ || 0,
      patchedBase: !!window.__PATCHED_BASE__,
      patchedFinal: !!window.__PATCHED_FINAL__,
      canvases: document.querySelectorAll('canvas').length,
      title: document.title,
      bodyText: (document.body.innerText||'').slice(0,80)
    })`).catch(e => String(e));
    console.log(st);
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
