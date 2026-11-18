const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(__dirname + '/cache/index.html');
const pkg = fs.readFileSync(__dirname + '/out/append.pkg');

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Debugger.enable');
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'all' });
    let done = false;
    client.cdp.on('Debugger.paused', async ev => {
      try {
        if (done) { await client.cdp.send('Debugger.resume').catch(() => {}); return; }
        done = true;
        const frame = (ev.callFrames || [])[0];
        const scriptId = frame && frame.location && frame.location.scriptId;
        const src = await client.cdp.send('Debugger.getScriptSource', { scriptId });
        fs.writeFileSync(__dirname + '/eval-source.js', src.scriptSource, 'utf8');
        console.log('scriptId', scriptId, 'len', src.scriptSource.length, 'desc', ev.data && ev.data.description);
        await client.cdp.send('Debugger.resume').catch(() => {});
      } catch (e) { console.log('ERR', String(e)); try { await client.cdp.send('Debugger.resume'); } catch (_) {} }
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
    await new Promise(r => setTimeout(r, 8000));
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'none' }).catch(() => {});
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
})();
