const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const od = TextDecoder.prototype.decode;
    TextDecoder.prototype.decode = function (buf, opts) {
      const s = od.call(this, buf, opts);
      try {
        if (s.length > 5000000) {
          const i = s.indexOf('battle_royale');
          window.__DEC__ = { len: s.length, bytes: buf && buf.byteLength, head: s.slice(0, 160), idx: i, ctx: i >= 0 ? s.slice(i - 80, i + 120) : '' };
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
    await new Promise(r => setTimeout(r, 10000));
    const r = await client.evaluate('JSON.stringify(window.__DEC__ || null)').catch(e => String(e));
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
