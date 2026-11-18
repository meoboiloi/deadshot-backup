const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  let src = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');
  const needle = "ui['BYFY3_yc']=function(";
  if (!src.includes(needle)) { console.log('needle not found'); return; }
  src = src.replace(needle, "window.__UI__=ui;window.__CTJ__=cTj;" + needle);
  fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/debug-ui-source.js', src, 'utf8');

  const init = `window.__PATCH_SRC__ = ${JSON.stringify(src)};\n(` + function () {
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

  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: init });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 12000));
    const st = await client.evaluate(`(() => {
      try {
        const ui = window.__UI__;
        const out = { hasUI: !!ui, hasModal: !!window.__CTJ__ };
        if (ui && ui.BYFY3_yc) {
          ui.BYFY3_yc(false);
          out.after = {
            body: (document.body.innerText || '').slice(0, 400),
            modalText: (window.__CTJ__ && window.__CTJ__.overlay ? (window.__CTJ__.overlay.innerText || '') : ''),
            modalKeys: window.__CTJ__ ? Object.keys(window.__CTJ__).slice(0, 20) : null
          };
        }
        return JSON.stringify(out);
      } catch (e) { return 'ERR ' + e + ' ' + e.stack; }
    })()`).catch(e => String(e));
    console.log(st);
  } finally { await client.disconnect().catch(() => {}); }
})();
