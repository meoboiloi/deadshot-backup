const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');
(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    try {
      await client.cdp.send('Page.handleJavaScriptDialog', { accept: false });
      console.log('dialog dismissed (accept=false)');
    } catch (e) {
      console.log('handle dialog error:', e.message);
    }
    await new Promise(r => setTimeout(r, 500));
    try {
      const v = await client.evaluate('JSON.stringify({ok:1, title:document.title, canvases:document.querySelectorAll("canvas").length})');
      console.log('eval after dismiss:', v);
    } catch (e) {
      console.log('eval still blocked:', e.message);
    }
  } finally {
    await client.disconnect().catch(() => {});
  }
})();
