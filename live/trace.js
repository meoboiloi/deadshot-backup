const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  if (window.__TRACE_INSTALLED__) return;
  window.__TRACE_INSTALLED__ = true;
  window.__TRACE__ = [];
  const T = window.__TRACE__;
  const add = (o) => { try { if (T.length < 300) T.push(o); } catch (e) {} };
  const stack = () => { try { return (new Error()).stack.split('\\n').slice(1, 7).join('\\n'); } catch (e) { return ''; } };
  const wrap = (obj, name, label, summarize) => {
    try {
      const orig = obj[name];
      if (typeof orig !== 'function') return;
      obj[name] = function (...args) {
        try { add({ api: label, args: summarize ? summarize(args) : undefined, stack: stack() }); } catch (e) {}
        return orig.apply(this, args);
      };
    } catch (e) {}
  };
  const arrInfo = (v) => {
    try {
      if (v && typeof v === 'object' && typeof v.byteLength === 'number') return { byteLength: v.byteLength, type: v.constructor && v.constructor.name };
      if (typeof v === 'string') return { string: v.slice(0, 60), length: v.length };
      if (v && typeof v === 'object') return { keys: Object.keys(v).slice(0, 8) };
      return v;
    } catch (e) { return '?'; }
  };
  // Function capture
  try {
    const Orig = Function;
    const cap = (args) => {
      try {
        const s = args.length ? String(args[args.length - 1]) : '';
        add({ api: 'Function', args: { argc: args.length, srcLen: s.length, srcHead: s.slice(0, 80), params: args.slice(0, -1).map(String).slice(0, 6) }, stack: stack() });
        if (s.length > 500000) { window.__CAP__ = { len: s.length, source: s }; }
      } catch (e) {}
    };
    const P = new Proxy(Orig, {
      construct(t, a, n) { cap(a); return Reflect.construct(t, a, n); },
      apply(t, th, a) { cap(a); return Reflect.apply(t, th, a); }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
  // fetch
  wrap(window, 'fetch', 'fetch', (a) => ({ url: String(a[0]).slice(0, 200), opts: a[1] && Object.keys(a[1]) }));
  // XHR
  try {
    wrap(XMLHttpRequest.prototype, 'open', 'xhr.open', (a) => ({ method: a[0], url: String(a[1]).slice(0, 200) }));
    wrap(XMLHttpRequest.prototype, 'send', 'xhr.send', (a) => ({ body: arrInfo(a[0]) }));
  } catch (e) {}
  // WebCrypto
  try {
    const SC = SubtleCrypto.prototype;
    wrap(SC, 'verify', 'subtle.verify', (a) => ({ alg: a[0], sig: arrInfo(a[1]), data: arrInfo(a[2]), key: arrInfo(a[3]) }));
    wrap(SC, 'decrypt', 'subtle.decrypt', (a) => ({ alg: a[0], key: arrInfo(a[1]), data: arrInfo(a[2]) }));
    wrap(SC, 'encrypt', 'subtle.encrypt', (a) => ({ alg: a[0], data: arrInfo(a[2]) }));
    wrap(SC, 'importKey', 'subtle.importKey', (a) => ({ fmt: a[0], data: arrInfo(a[1]), alg: a[2], extractable: a[3], usages: a[4] }));
    wrap(SC, 'deriveKey', 'subtle.deriveKey', (a) => ({ alg: a[0], baseKey: arrInfo(a[1]), derived: a[2], usages: a[4] }));
    wrap(SC, 'deriveBits', 'subtle.deriveBits', (a) => ({ alg: a[0], len: a[2] }));
    wrap(SC, 'digest', 'subtle.digest', (a) => ({ alg: a[0], data: arrInfo(a[1]) }));
  } catch (e) {}
  // DecompressionStream
  try {
    const OrigDS = window.DecompressionStream;
    if (OrigDS) {
      window.DecompressionStream = function (...a) { add({ api: 'DecompressionStream', args: { format: a[0] }, stack: stack() }); return new OrigDS(...a); };
      window.DecompressionStream.prototype = OrigDS.prototype;
    }
  } catch (e) {}
  // TextDecoder (large only)
  try {
    const TD = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (...a) {
      try { if (a[0] && a[0].byteLength > 50000) add({ api: 'TextDecoder.decode', args: { bytes: a[0].byteLength, label: this.encoding }, stack: stack() }); } catch (e) {}
      return TD.apply(this, a);
    };
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500));
      const cap = await client.evaluate('window.__CAP__ ? window.__CAP__.len : 0').catch(() => 0);
      if (cap) break;
    }
    const trace = await client.evaluate('window.__TRACE__ || []');
    fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/trace.json', JSON.stringify(trace, null, 2), 'utf8');
    console.log('trace entries', trace.length);
    for (const t of trace.slice(0, 40)) console.log(JSON.stringify(t).slice(0, 400));
    const capLen = await client.evaluate('window.__CAP__ ? window.__CAP__.len : 0').catch(() => 0);
    console.log('CAP len', capLen);
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
