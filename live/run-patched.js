// Usage: node run-patched.js <patched-source.js> [url]
// Reads a patched DEADSHOT source (base or final variant), injects it at
// document-start, and swaps it in place of the original body when the loader
// calls new Function(...45 params, source).
const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const file = process.argv[2];
const url = process.argv[3] || 'https://deadshot.io/';
if (!file) { console.error('usage: node run-patched.js <patched-source.js> [url]'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');

const hook = `(${function () {
  try {
    const Orig = Function;
    const cap = (a) => {
      try {
        const s = a.length ? String(a[a.length - 1]) : '';
        if (a.length === 45 && s.length > 5000000 && window.__PATCH_SRC__) {
          window.__REPLACED__ = true;
          return a.slice(0, -1).concat([window.__PATCH_SRC__]);
        }
      } catch (e) {}
      return a;
    };
    const P = new Proxy(Orig, {
      construct(t, a, n) { return Reflect.construct(t, cap(a), n); },
      apply(t, th, a) { return Reflect.apply(t, th, cap(a)); }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
}.toString()})();`;

const init = `window.__PATCH_SRC__ = ${JSON.stringify(src)};\n${hook}`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: init });
    await client.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 12000));
    const st = await client.evaluate(`JSON.stringify({
      srcLen: window.__PATCH_SRC__ && window.__PATCH_SRC__.length,
      replaced: !!window.__REPLACED__,
      patchOk: !!window.__PATCH_OK__,
      canvases: document.querySelectorAll('canvas').length,
      title: document.title
    })`).catch(e => String(e));
    console.log(st);
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
