const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(__dirname + '/cache/index.html');
const pkg = fs.readFileSync(process.argv[2] || (__dirname + '/out/append.pkg'));

const EXPRS = [
  'Array.from(sLk35j).join(",")',
  'Array.from(sjHcJKb).join(",")',
  'MBtp4x.length',
  'RW3nTYi.length',
  'Array.from(RW3nTYi.slice(0,16)).join(",")',
  'Array.from(RW3nTYi.slice(-16)).join(",")'
];

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const out = [];
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Debugger.enable');
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'all' });
    client.cdp.on('Debugger.paused', async ev => {
      try {
        if (out.length >= 1) { await client.cdp.send('Debugger.resume').catch(() => {}); return; }
        const frame = (ev.callFrames || [])[0];
        const rec = [];
        for (const ex of EXPRS) {
          try {
            const r = await client.cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: ex, returnByValue: true, silent: true });
            rec.push({ ex, value: r.result && (r.result.value !== undefined ? r.result.value : r.result.description) });
          } catch (e) { rec.push({ ex, err: String(e) }); }
        }
        out.push(rec);
        await client.cdp.send('Debugger.resume').catch(() => {});
      } catch (e) { try { await client.cdp.send('Debugger.resume'); } catch (_) {} }
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
    await new Promise(r => setTimeout(r, 9000));
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'none' }).catch(() => {});
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
  console.log(JSON.stringify(out, null, 1));
})();
