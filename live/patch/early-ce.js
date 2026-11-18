(() => {
  window.__CE = [];
  const oe = console.error;
  console.error = function () {
    try {
      const arr = [].slice.call(arguments).map(a => {
        try {
          if (a instanceof Error) return a.name + ': ' + a.message + '\n' + a.stack;
          if (a && typeof a === 'object') {
            const o = {};
            for (const k of Object.keys(a).slice(0, 20)) { try { o[k] = typeof a[k] === 'object' ? JSON.stringify(a[k]) : String(a[k]); } catch (e) { o[k] = '?'; } }
            return JSON.stringify(o);
          }
          return String(a);
        } catch (e) { return typeof a; }
      });
      if (window.__CE.length < 30) window.__CE.push(arr);
    } catch (e) {}
    return oe.apply(this, arguments);
  };
  const stubV = function verify(a, k, s, d) { window.__VBC = (window.__VBC || 0) + 1; return Promise.resolve(true); };
  try { Object.defineProperty(SubtleCrypto.prototype, 'verify', { configurable: true, enumerable: true, get() { return stubV; }, set() {} }); } catch (e) {}
  try {
    const p = SubtleCrypto.prototype; const od = p.decrypt;
    p.decrypt = async function () { const r = await od.apply(this, arguments); window.__PLAIN = r.byteLength; return r; };
  } catch (e) {}
  try {
    const td = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (b, o) { try { const n = b && b.byteLength; if (n > 1000 && (window.__TD = window.__TD || []).length < 20) window.__TD.push(n); } catch (e) {} return td.call(this, b, o); };
  } catch (e) {}
})();
