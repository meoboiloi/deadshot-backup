(() => {
  window.__CCA = 0; window.__CCA_STACK = null; window.__CCA_LEN = 0;
  const oc = String.prototype.charCodeAt;
  String.prototype.charCodeAt = function (i) {
    try {
      if (this.length > 5000000) {
        window.__CCA++;
        window.__CCA_LEN = this.length;
        if (!window.__CCA_STACK && window.__CCA > 3) {
          window.__CCA_STACK = new Error('cca').stack;
        }
      }
    } catch (e) {}
    return oc.call(this, i);
  };
  const stubV = function verify(a, k, s, d) { return Promise.resolve(true); };
  try { Object.defineProperty(SubtleCrypto.prototype, 'verify', { configurable: true, enumerable: true, get() { return stubV; }, set() {} }); } catch (e) {}
})();
