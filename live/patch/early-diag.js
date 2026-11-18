(() => {
  window.__ERRS = []; window.__REJ = [];
  window.addEventListener('error', e => { try { window.__ERRS.push(String(e.message) + ' @' + (e.filename || '') + ':' + e.lineno); } catch (_) {} });
  window.addEventListener('unhandledrejection', e => { try { window.__REJ.push(String(e.reason && (e.reason.stack || e.reason.message || e.reason))); } catch (_) {} });
  window.__C = { decrypt: 0, decryptOk: 0, decryptErr: 0, ds: 0, td: 0, fn: 0, fnLen: 0, ic: 0 };
  window.__R = [];
  try {
    const of = window.fetch;
    window.fetch = async function (u, o) {
      const url = String((u && u.url) || u);
      const res = await of.apply(this, arguments);
      if (!/pkg/.test(url)) return res;
      const log = (k, v) => { try { window.__R.push(k + '=' + String(v).slice(0, 90)); } catch (e) {} };
      log('url', url);
      return new Proxy(res, {
        get(t, p) {
          try {
            if (p === 'headers') {
              const h = t.headers;
              return new Proxy(h, {
                get(ht, hp) {
                  if (hp === 'get') return n => { const v = ht.get(n); log('h:' + n, v); return v; };
                  const v = ht[hp];
                  return typeof v === 'function' ? v.bind(ht) : v;
                }
              });
            }
            if (p === 'arrayBuffer') return async () => { try { const b = await t.arrayBuffer(); log('arrayBuffer', b.byteLength); return b; } catch (e) { log('arrayBuffer-err', e); throw e; } };
            if (p === 'clone') return () => { log('clone'); return t.clone(); };
            if (typeof p === 'string') {
              const v = t[p];
              log(p, typeof v === 'object' ? '[obj]' : v);
              return typeof v === 'function' ? v.bind(t) : v;
            }
            return t[p];
          } catch (e) { log('proxy-err', e); throw e; }
        }
      });
    };
  } catch (e) {}
  try {
    const p = SubtleCrypto.prototype;
    const od = p.decrypt;
    p.decrypt = async function () {
      window.__C.decrypt++;
      try { const r = await od.apply(this, arguments); window.__C.decryptOk++; return r; }
      catch (e) { window.__C.decryptErr++; window.__C.decryptErrMsg = String(e && (e.name + ': ' + e.message)); throw e; }
    };
    const oi = p.importKey;
    p.importKey = async function () { window.__C.ic++; return oi.apply(this, arguments); };
  } catch (e) {}
  try {
    const D = window.DecompressionStream;
    if (D) window.DecompressionStream = class extends D { constructor(f) { super(f); window.__C.ds++; } };
  } catch (e) {}
  try {
    const td = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (b, o) {
      try { if (b && b.byteLength > 100000) window.__C.td = b.byteLength; } catch (e) {}
      return td.call(this, b, o);
    };
  } catch (e) {}
  try {
    const F = window.Function;
    const P = new Proxy(F, {
      construct(t, a, n) {
        try { const s = a.length ? String(a[a.length - 1]) : ''; if (s.length > 100000) { window.__C.fn++; window.__C.fnLen = s.length; window.__C.fnArgc = a.length; } } catch (e) {}
        return Reflect.construct(t, a, n);
      }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
})();
