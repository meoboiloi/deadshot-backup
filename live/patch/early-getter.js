(() => {
  window.__VGET = [];
  const stub = function verify(algorithm, key, signature, data) {
    window.__VBC = (window.__VBC || 0) + 1;
    return Promise.resolve(true);
  };
  try {
    Object.defineProperty(SubtleCrypto.prototype, 'verify', {
      configurable: true,
      enumerable: true,
      get() {
        try {
          if (window.__VGET.length < 20) window.__VGET.push(new Error('get-verify').stack);
        } catch (e) {}
        return stub;
      },
      set(v) { try { if (window.__VGET.length < 20) window.__VGET.push('SET ' + String(v).slice(0, 60)); } catch (e) {} }
    });
  } catch (e) { window.__VGETERR = String(e); }
})();
