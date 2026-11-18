const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const OUT = 'C:/Users/Administrator/Downloads/deadshot/live/loader-trace.log';

const HOOK = `(() => {
  const L = []; window.__TRACE = L;
  const push = (o) => { try { L.push(o); if (L.length > 500) L.shift(); } catch (e) {} };
  const hex = (b) => { try { return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return null; } };
  try {
    const p = SubtleCrypto.prototype;
    for (const name of ['importKey', 'verify', 'decrypt', 'deriveKey', 'digest']) {
      const orig = p[name];
      if (typeof orig !== 'function') continue;
      p[name] = async function () {
        const a = [].slice.call(arguments);
        const rec = { op: name, args: a.map(x => x && x.constructor ? x.constructor.name : typeof x) };
        try {
          if (name === 'importKey') rec.detail = { format: a[0], keyData: a[1] instanceof ArrayBuffer || ArrayBuffer.isView(a[1]) ? hex(a[1]) : String(a[1]).slice(0, 40), alg: a[2] && a[2].name, usages: a[3] };
          if (name === 'verify') rec.detail = { alg: a[0] && a[0].name, key: a[1] && a[1].constructor && a[1].constructor.name, sigLen: a[2] && a[2].byteLength, dataLen: a[3] && a[3].byteLength };
          if (name === 'decrypt') rec.detail = { alg: a[0] && (a[0].name + '/' + a[0].iv), dataLen: a[2] && a[2].byteLength };
        } catch (e) {}
        const r = await orig.apply(this, arguments);
        try {
          if (name === 'verify' || name === 'decrypt') rec.result = name === 'verify' ? r : (r && r.byteLength);
          if (name === 'importKey') rec.ok = !!r;
        } catch (e) {}
        push(rec);
        return r;
      };
    }
  } catch (e) { push({ op: 'subtle-hook-error', e: String(e) }); }
  try {
    const D = window.DecompressionStream;
    if (D) {
      window.DecompressionStream = class extends D {
        constructor(format) { super(format); push({ op: 'DecompressionStream', format }); }
      };
    }
  } catch (e) {}
  try {
    const td = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (buf, opts) {
      try { const n = buf && (buf.byteLength !== undefined ? buf.byteLength : (buf.length || 0)); if (n > 100000) push({ op: 'TextDecoder', n, head: '' }); } catch (e) {}
      return td.call(this, buf, opts);
    };
  } catch (e) {}
  try {
    const F = window.Function;
    const P = new Proxy(F, {
      construct(t, a, n) {
        try {
          const s = a.length ? String(a[a.length - 1]) : '';
          if (s.length > 100000) push({ op: 'Function', argc: a.length, srcLen: s.length, params: String(a.slice(0, -1).join(',')).slice(0, 600), head: s.slice(0, 120) });
        } catch (e) {}
        return Reflect.construct(t, a, n);
      }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
  try {
    const of = window.fetch;
    window.fetch = function (u, o) {
      try { push({ op: 'fetch', url: String(u && u.url || u) }); } catch (e) {}
      return of.apply(this, arguments);
    };
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const lines = [];
  const w = s => { lines.push(s); try { fs.appendFileSync(OUT, s + '\n'); } catch (e) {} };
  fs.writeFileSync(OUT, '');
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.enable').catch(() => {});
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e => w('[GOTO] ' + e.message));
    await new Promise(r => setTimeout(r, 15000));
    const trace = await client.evaluate('JSON.stringify(window.__TRACE || [])').catch(e => 'ERR ' + e.message);
    w('[TRACE] ' + trace);
    w('[STATE] ' + await client.evaluate('JSON.stringify({g2:!!window.__g2,canvases:document.querySelectorAll("canvas").length})').catch(e => 'ERR ' + e.message));
  } finally { await client.disconnect().catch(() => {}); }
  const t = fs.readFileSync(OUT, 'utf8');
  console.log(t.slice(0, 12000));
})();
