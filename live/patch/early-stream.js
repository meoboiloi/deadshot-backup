(() => {
  window.__RS = []; window.__TD = []; window.__VGET = [];
  const stub = function verify(a, k, s, d) { window.__VBC = (window.__VBC || 0) + 1; return Promise.resolve(true); };
  try {
    Object.defineProperty(SubtleCrypto.prototype, 'verify', { configurable: true, enumerable: true, get() { return stub; }, set() {} });
  } catch (e) {}
  try {
    const p = SubtleCrypto.prototype;
    const od = p.decrypt;
    p.decrypt = async function () {
      const r = await od.apply(this, arguments);
      window.__PLAIN = r.byteLength;
      return r;
    };
  } catch (e) {}
  try {
    const og = ReadableStream.prototype.getReader;
    ReadableStream.prototype.getReader = function () {
      const reader = og.call(this);
      const rec = { bytes: 0, reads: 0, done: false, err: null };
      if (window.__RS.length < 10) window.__RS.push(rec);
      return new Proxy(reader, {
        get(t, p) {
          if (p === 'read') return async () => {
            try {
              const r = await t.read();
              if (r.done) rec.done = true;
              else { rec.reads++; rec.bytes += (r.value && (r.value.byteLength || r.value.length)) || 0; }
              return r;
            } catch (e) { rec.err = String(e && (e.name + ': ' + e.message)); throw e; }
          };
          const v = t[p];
          return typeof v === 'function' ? v.bind(t) : v;
        }
      });
    };
  } catch (e) {}
  try {
    const td = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (b, o) {
      try { const n = b && b.byteLength; if (n > 1000 && window.__TD.length < 20) window.__TD.push(n); } catch (e) {}
      return td.call(this, b, o);
    };
  } catch (e) {}
})();
