const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    const t = await client.cdp.send('Target.getTargets').catch(e => ({ err: String(e) }));
    console.log('KEYS', JSON.stringify(Object.keys(t)));
    console.log('RAW', JSON.stringify(t).slice(0, 500));
    const st = await client.evaluate('JSON.stringify({vis:document.visibilityState,hidden:document.hidden,fs:!!document.fullscreenElement,iw:innerWidth,ih:innerHeight})');
    console.log('STATE', st);
  } finally { await client.disconnect().catch(() => {}); }
})();
