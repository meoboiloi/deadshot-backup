// Builds out-hook/index.html: original page + a Function interceptor installed
// before the loader. The loader still fetches/decrypts/verifies the ORIGINAL
// final.pkg (so all integrity checks pass); the interceptor patches the source
// string right before it is compiled.
//
// Usage: node build-hook.js
const fs = require('fs');
const crypto = require('crypto');

const DIR = __dirname;
const OUT = DIR + '/out-hook';
const CACHE = DIR + '/cache';
const BASE = 'https://deadshot.io/';

const ANTI_HOOK = [
  ['var dax=window[', 'cXu=!1;dav=!1;var dax=window['],
  ['if(cXu)var daC', 'if(!1)var daC'],
  ['(dru||dav)&&alert(', '(!1)&&alert(']
];

const injectSrc = fs.existsSync(DIR + '/inject.js')
  ? fs.readFileSync(DIR + '/inject.js', 'utf8')
  : 'console.log("[DS-PATCH] bundle running");';

const HOOK = `(() => {
  try {
    if (window.__DS_HOOK) return;
    window.__DS_HOOK = { calls: 0, patched: 0 };
    const ANTI = ${JSON.stringify(ANTI_HOOK)};
    const INJECT = ${JSON.stringify(injectSrc)};
    const ANCHOR = 'game2.update=function';
    const patch = (src) => {
      let out = src;
      for (const [a, b] of ANTI) out = out.split(a).join(b);
      const i = out.indexOf(ANCHOR);
      if (i >= 0) out = out.slice(0, i) + '\\n/* DS-PATCH: inject */\\n' + INJECT + '\\n' + out.slice(i);
      window.__DS_HOOK.patched++;
      return out;
    };
    const Orig = Function;
    const P = new Proxy(Orig, {
      construct(t, a, n) {
        try {
          const last = a.length ? a[a.length - 1] : null;
          if (typeof last === 'string' && last.length > 5e6) {
            window.__DS_HOOK.calls++;
            a = a.slice(0, -1).concat([patch(last)]);
          }
        } catch (e) { window.__DS_HOOK.err = String(e); }
        return Reflect.construct(t, a, n);
      },
      apply(t, th, a) {
        try {
          const last = a.length ? a[a.length - 1] : null;
          if (typeof last === 'string' && last.length > 5e6) {
            window.__DS_HOOK.calls++;
            a = a.slice(0, -1).concat([patch(last)]);
          }
        } catch (e) { window.__DS_HOOK.err = String(e); }
        return Reflect.apply(t, th, a);
      }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
    console.log('[DS-HOOK] installed');
  } catch (e) { console.log('[DS-HOOK] error', String(e)); }
})();`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });
  let html;
  if (!process.argv.includes('--offline')) {
    const r = await fetch(BASE, { headers: { 'user-agent': 'Mozilla/5.0' } });
    html = await r.text();
    fs.writeFileSync(CACHE + '/index.html', html, 'utf8');
  } else {
    html = fs.readFileSync(CACHE + '/index.html', 'utf8');
  }

  const m = /<script\b[^>]*>/i.exec(html);
  if (!m) throw new Error('no <script>');
  const at = m.index + m[0].length;
  const newHtml = html.slice(0, at) + '\n' + HOOK + '\n' + html.slice(at);
  fs.writeFileSync(OUT + '/index.html', newHtml, 'utf8');
  console.log(JSON.stringify({
    htmlBytes: Buffer.byteLength(newHtml),
    sha256: crypto.createHash('sha256').update(newHtml).digest('hex'),
    out: OUT
  }, null, 2));
})();
