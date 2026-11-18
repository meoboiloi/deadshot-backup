const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const SC = SubtleCrypto.prototype;
    const orig = SC.importKey;
    window.__KEYS__ = [];
    SC.importKey = function (format, keyData, algorithm, extractable, usages) {
      try {
        if (format === 'raw' && keyData && keyData.byteLength === 32) {
          window.__KEYS__.push({ alg: algorithm && algorithm.name, usages: usages, hex: Array.from(new Uint8Array(keyData)).map(b => b.toString(16).padStart(2, '0')).join('') });
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    let keys = [];
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500));
      keys = await client.evaluate('window.__KEYS__ || []').catch(() => []);
      if (keys.length >= 2) break;
    }
    console.log(JSON.stringify(keys, null, 2));
    fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/keys.json', JSON.stringify(keys, null, 2), 'utf8');
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
