(() => {
  window.__VCALL = [];
  const f = function verify(a, k, s, d) {
    try { if (window.__VCALL.length < 4) window.__VCALL.push(new Error('verify-call').stack); } catch (e) {}
    return Promise.resolve(true);
  };
  try {
    Object.defineProperty(SubtleCrypto.prototype, 'verify', {
      configurable: true, enumerable: true, get() { return f; }, set() {}
    });
  } catch (e) { window.__VCALL_ERR = String(e); }
})();
