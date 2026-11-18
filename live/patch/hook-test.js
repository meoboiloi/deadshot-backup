const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(__dirname + '/out-hook/index.html');
const pkg = fs.readFileSync(__dirname + '/cache/final.pkg');

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const logs = [];
  try {
    client.page.on('console', m => logs.push('[console.' + m.type() + '] ' + m.text()));
    client.page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Fetch.enable', {
      patterns: [
        { urlPattern: 'https://deadshot.io/', requestStage: 'Request' },
        { urlPattern: 'https://deadshot.io/final.pkg*', requestStage: 'Request' }
      ]
    });
    client.cdp.on('Fetch.requestPaused', async ev => {
      try {
        const isPkg = /final\.pkg/.test(ev.request.url);
        await client.cdp.send('Fetch.fulfillRequest', {
          requestId: ev.requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: isPkg ? 'application/octet-stream' : 'text/html; charset=utf-8' }, { name: 'Cache-Control', value: 'no-store' }],
          body: (isPkg ? pkg : html).toString('base64')
        });
      } catch (e) {}
    });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e => logs.push('[goto] ' + e.message));
    await new Promise(r => setTimeout(r, 16000));
    const st = await client.evaluate(`JSON.stringify({
      canvases: document.querySelectorAll('canvas').length,
      hook: window.__DS_HOOK || null,
      g2: !!window.__g2,
      body: (document.body.innerText || '').slice(0, 60)
    })`).catch(e => 'ERR ' + e.message);
    logs.push('[state] ' + st);
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/hook-test.log', logs.join('\n'), 'utf8');
  console.log(logs.filter(l => /DS-|state|pageerror|goto/.test(l)).join('\n'));
})();
