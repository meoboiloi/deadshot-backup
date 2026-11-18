const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const od = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (buf, opts) {
      let s = od.call(this, buf, opts);
      try {
        if (s.length > 5000000) {
          window.__DEC_LEN__ = s.length;
          window.__DEC_HEAD__ = s.slice(0, 80);
          const needle = 'var battle_royale_enabled=';
          if (s.indexOf(needle) === 0) {
            s = s.replace(needle, needle + '(window.__PATCHED_DEC__=true,');
            s = s.replace(';var e0f=o;', ');var e0f=o;');
          }
        }
      } catch (e) {}
      return s;
    };
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 12000));
    const st = await client.evaluate(`JSON.stringify({len: window.__DEC_LEN__||0, head: window.__DEC_HEAD__||'', patched: !!window.__PATCHED_DEC__, canvases: document.querySelectorAll('canvas').length, title: document.title})`).catch(e => String(e));
    console.log(st);
  } finally { await client.disconnect().catch(() => {}); }
})();
