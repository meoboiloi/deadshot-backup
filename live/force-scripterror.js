const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');
const HOOK = `(() => {
  const orig = window.alert;
  window.__ALERTS__ = [];
  window.alert = function (msg) {
    try { window.__ALERTS__.push({ msg: String(msg), stack: (new Error()).stack }); } catch (e) {}
    if (String(msg).indexOf('browser extensions') >= 0) return;
    return orig.apply(this, arguments);
  };
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  const dialogs = [];
  try {
    client.page.on('dialog', async d => { dialogs.push({ type: d.type(), message: d.message() }); console.log('DIALOG', d.message()); try { await d.dismiss(); } catch (e) {} });
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 3000));
    const fire = await client.evaluate(`(() => { try { window.onerror('Script error.', '', 0, 0, null); return 'fired'; } catch(e){ return 'ERR '+e; } })()`).catch(e => 'ERR ' + e.message);
    console.log('fire', fire);
    await new Promise(r => setTimeout(r, 5000));
    console.log('alerts', await client.evaluate('JSON.stringify(window.__ALERTS__||[])').catch(e => 'ERR ' + e.message));
    console.log('dialogs', JSON.stringify(dialogs));
    console.log('state', await client.evaluate('JSON.stringify({title:document.title,canvases:document.querySelectorAll("canvas").length})').catch(e => 'ERR ' + e.message));
  } finally { await client.disconnect().catch(() => {}); }
})();
