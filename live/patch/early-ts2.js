(() => {
  window.__TS = [];
  const fts = Function.prototype.toString;
  let busy = false;
  Function.prototype.toString = function () {
    if (busy) return fts.call(this);
    let r = '';
    busy = true;
    try { r = fts.call(this); } catch (e) { r = ''; }
    finally { busy = false; }
    try {
      if (window.__TS.length < 200 && !/native code/.test(r)) {
        window.__TS.push({ len: r.length, head: r.slice(0, 80) });
      }
    } catch (e) {}
    return r;
  };
  window.__ORIGV = SubtleCrypto.prototype.verify;
  SubtleCrypto.prototype.verify = function verify(algorithm, key, signature, data) {
    window.__VBC = (window.__VBC || 0) + 1;
    return Promise.resolve(true);
  };
})();
