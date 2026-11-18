const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const orig = window.alert;
    window.__ALERTS__ = [];
    window.alert = function (msg) {
      try { window.__ALERTS__.push({ msg: String(msg), stack: (new Error()).stack }); } catch (e) {}
      if (String(msg).indexOf('browser extensions') >= 0) return;
      return orig.apply(this, arguments);
    };
  } catch (e) {}
})();`;

(async () => {
  for (let run = 1; run <= 2; run++) {
    const client = await connect({ port: 9222, autoEnableAll: false });
    const dialogs = [];
    try {
      client.page.on('dialog', async (d) => {
        const info = { type: d.type(), message: d.message() };
        dialogs.push(info);
        console.log('RUN', run, 'DIALOG', JSON.stringify(info));
        try { await d.dismiss(); } catch (e) {}
      });
      await client.cdp.send('Page.enable');
      await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
      await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 9000));
      const alerts = await client.evaluate('JSON.stringify(window.__ALERTS__ || [])').catch(e => 'ERR ' + e.message);
      console.log('RUN', run, 'alerts', alerts);
      console.log('RUN', run, 'dialogs', JSON.stringify(dialogs));
    } finally {
      await client.disconnect().catch(() => {});
    }
    await new Promise(r => setTimeout(r, 1000));
  }
})();
