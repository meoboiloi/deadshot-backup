(() => {
  window.__TS = []; window.__SUB = [];
  const fts = Function.prototype.toString;
  Function.prototype.toString = function () {
    let r = '';
    try { r = fts.call(this); } catch (e) { r = ''; }
    try {
      window.__TS.push({ len: r.length, head: r.slice(0, 50), name: this && this.name, fnLen: this && this.length, native: /native code/.test(r) });
    } catch (e) {}
    return r;
  };
  try {
    const cd = Object.getOwnPropertyDescriptor(Crypto.prototype, 'subtle');
    const origGet = cd.get;
    Object.defineProperty(Crypto.prototype, 'subtle', {
      configurable: true,
      get: function () {
        const s = origGet.call(this);
        return new Proxy(s, {
          get(t, p) {
            try {
              const v = t[p];
              window.__SUB.push({ p: String(p), type: typeof v, isNewVerify: p === 'verify' && v !== window.__ORIGV });
              return typeof v === 'function' ? v.bind(t) : v;
            } catch (e) { return undefined; }
          }
        });
      }
    });
  } catch (e) { window.__SUBERR = String(e); }
  window.__ORIGV = SubtleCrypto.prototype.verify;
  SubtleCrypto.prototype.verify = function (a, k, s, d) {
    window.__VBC = (window.__VBC || 0) + 1;
    return Promise.resolve(true);
  };
})();
