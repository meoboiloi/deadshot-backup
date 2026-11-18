(() => {
  window.__DIG = [];
  const stubV = function verify(a, k, s, d) { return Promise.resolve(true); };
  try { Object.defineProperty(SubtleCrypto.prototype, 'verify', { configurable: true, enumerable: true, get() { return stubV; }, set() {} }); } catch (e) {}
  try {
    const p = SubtleCrypto.prototype;
    const od = p.digest;
    p.digest = async function (alg, data) {
      const r = await od.apply(this, arguments);
      try {
        const hex = Array.from(new Uint8Array(r)).map(x => x.toString(16).padStart(2, '0')).join('');
        if (window.__DIG.length < 10) window.__DIG.push({ alg: alg && (alg.name || alg), dataLen: data && data.byteLength, hex });
      } catch (e) {}
      return r;
    };
  } catch (e) { window.__DIGERR = String(e); }
  try {
    const td = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (b, o) { try { const n = b && b.byteLength; if (n > 1000 && (window.__TD = window.__TD || []).length < 20) window.__TD.push(n); } catch (e) {} return td.call(this, b, o); };
  } catch (e) {}
})();
