(() => {
  window.__VGET = []; window.__DEC = []; window.__C = { ic: [], ds: 0, td: 0, fn: 0, fnLen: 0 };
  const stub = function verify(algorithm, key, signature, data) {
    window.__VBC = (window.__VBC || 0) + 1;
    return Promise.resolve(true);
  };
  try {
    Object.defineProperty(SubtleCrypto.prototype, 'verify', {
      configurable: true, enumerable: true,
      get() {
        try { if (window.__VGET.length < 5) window.__VGET.push(new Error('get-verify').stack); } catch (e) {}
        return stub;
      },
      set() {}
    });
  } catch (e) { window.__VGETERR = String(e); }

  try {
    const p = SubtleCrypto.prototype;
    const od = p.decrypt;
    p.decrypt = async function (alg, key, data) {
      const rec = { alg: alg && alg.name, ivLen: alg && alg.iv && alg.iv.byteLength, aad: alg && alg.additionalData ? alg.additionalData.byteLength : null, tagLen: alg && alg.tagLength, dataLen: data && data.byteLength };
      try {
        const r = await od.apply(this, arguments);
        rec.ok = true; rec.outLen = r && r.byteLength;
        window.__DEC.push(rec);
        return r;
      } catch (e) {
        rec.ok = false; rec.err = String(e && (e.name + ': ' + e.message));
        window.__DEC.push(rec);
        throw e;
      }
    };
    const oi = p.importKey;
    p.importKey = function (format, keyData, alg) {
      try { window.__C.ic.push({ format, alg: alg && alg.name, len: keyData && (keyData.byteLength !== undefined ? keyData.byteLength : 'jwk'), hex: keyData && keyData.byteLength ? Array.from(new Uint8Array(keyData)).map(x => x.toString(16).padStart(2, '0')).join('') : null }); } catch (e) {}
      return oi.apply(this, arguments);
    };
  } catch (e) {}
  try {
    const D = window.DecompressionStream;
    if (D) window.DecompressionStream = class extends D { constructor(f) { super(f); window.__C.ds++; } };
  } catch (e) {}
  try {
    const td = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (b, o) { try { if (b && b.byteLength > 100000) window.__C.td = b.byteLength; } catch (e) {} return td.call(this, b, o); };
  } catch (e) {}
  try {
    const F = window.Function;
    const P = new Proxy(F, {
      construct(t, a, n) { try { const s = a.length ? String(a[a.length - 1]) : ''; if (s.length > 100000) { window.__C.fn++; window.__C.fnLen = s.length; window.__C.fnArgc = a.length; } } catch (e) {} return Reflect.construct(t, a, n); }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
})();
