const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(process.env.DS_HTML || (__dirname + '/out/index.html'));
const pkg = fs.readFileSync(process.argv[2] || (__dirname + '/out/append.pkg'));

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const paused = [];
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.enable').catch(() => {});
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Debugger.enable');
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'all' });
    client.cdp.on('Debugger.paused', async ev => {
      try {
        if (paused.length < 8) {
          paused.push({
            reason: ev.reason,
            data: ev.data && { desc: ev.data.description, type: ev.data.type, class: ev.data.className, value: ev.data.value },
            frames: (ev.callFrames || []).slice(0, 6).map(f => ({
              fn: f.functionName, url: (f.url || '').slice(0, 80), line: f.location.lineNumber, col: f.location.columnNumber
            }))
          });
        }
        await client.cdp.send('Debugger.resume').catch(() => {});
      } catch (e) {}
    });
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
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 12000));
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'none' }).catch(() => {});
    await client.cdp.send('Fetch.disable').catch(() => {});
    const st = await client.evaluate('JSON.stringify({canvases:document.querySelectorAll("canvas").length})').catch(e => 'ERR ' + e.message);
    console.log('STATE', st);
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/debug-paused.json', JSON.stringify(paused, null, 2), 'utf8');
  console.log(JSON.stringify(paused, null, 2).slice(0, 6000));
})();

