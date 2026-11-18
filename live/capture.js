const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const Orig = Function;
    const cap = (args) => {
      try {
        const s = args.length ? String(args[args.length - 1]) : '';
        if (s.length > 500000) {
          window.__CAP__ = { len: s.length, head: s.slice(0, 160), source: s, argTypes: args.map(a => typeof a) };
          window.__CAP_ARGS__ = args;
        }
      } catch (e) {}
    };
    const P = new Proxy(Orig, {
      construct(target, args, newTarget) { cap(args); return Reflect.construct(target, args, newTarget); },
      apply(target, thisArg, args) { cap(args); return Reflect.apply(target, thisArg, args); }
    });
    Object.defineProperty(window, 'Function', { value: P, configurable: true, writable: true });
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    let cap = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 500));
      cap = await client.evaluate('window.__CAP__ ? {len: window.__CAP__.len, head: window.__CAP__.head, argTypes: window.__CAP__.argTypes} : null').catch(() => null);
      if (cap) break;
    }
    console.log('CAPTURE', JSON.stringify(cap));
    if (cap) {
      const src = await client.evaluate('window.__CAP__.source');
      fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/captured.js', src, 'utf8');
      console.log('saved', src.length, 'chars to captured.js');
    }
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
