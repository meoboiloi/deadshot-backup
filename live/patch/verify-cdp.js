// End-to-end test of the response patch without mitmproxy:
// serve out/index.html and out/final.pkg through CDP Fetch interception.
const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const DIR = __dirname + '/out';
const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(DIR + '/index.html');
const pkg = fs.readFileSync(DIR + '/final.pkg');

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const logs = [];
  try {
    client.page.on('console', m => logs.push('[console.' + m.type() + '] ' + m.text()));
    client.page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.enable').catch(() => {});
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Fetch.enable', {
      patterns: [
        { urlPattern: 'https://deadshot.io/', requestStage: 'Request' },
        { urlPattern: 'https://deadshot.io/final.pkg*', requestStage: 'Request' },
        { urlPattern: 'https://deadshot.io/final_legacy.pkg*', requestStage: 'Request' }
      ]
    });
    client.cdp.on('Fetch.requestPaused', async ev => {
      const url = ev.request.url;
      try {
        if (url.indexOf('final.pkg') >= 0 || url.indexOf('final_legacy.pkg') >= 0) {
          await client.cdp.send('Fetch.fulfillRequest', {
            requestId: ev.requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'Content-Type', value: 'application/octet-stream' },
              { name: 'Cache-Control', value: 'no-store' }
            ],
            body: pkg.toString('base64')
          });
        } else {
          await client.cdp.send('Fetch.fulfillRequest', {
            requestId: ev.requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'Content-Type', value: 'text/html; charset=utf-8' },
              { name: 'Cache-Control', value: 'no-store' }
            ],
            body: html.toString('base64')
          });
        }
      } catch (e) {
        logs.push('[fulfill error] ' + e.message);
      }
    });

    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e => logs.push('[goto] ' + e.message));
    await new Promise(r => setTimeout(r, 15000));
    const st = await client.evaluate(`JSON.stringify({
      title: document.title,
      g2: !!window.__g2,
      marker: !!(window.__g2),
      canvases: document.querySelectorAll('canvas').length,
      patched: window.__PATCHED__ || null
    })`).catch(e => 'ERR ' + e.message);
    logs.push('[state] ' + st);
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/verify.log', logs.join('\n'), 'utf8');
  console.log(logs.filter(l => /DS-PATCH|pageerror|ERR|state|fulfill|goto/.test(l)).slice(0, 40).join('\n'));
})();
