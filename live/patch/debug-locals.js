const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(__dirname + '/cache/index.html');
const pkg = fs.readFileSync(process.argv[2] || (__dirname + '/out/append.pkg'));

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
        if (out.length >= 2) { await client.cdp.send('Debugger.resume').catch(() => {}); return; }
        const rec = { reason: ev.reason, desc: ev.data && ev.data.description, vars: [] };
        for (const frame of (ev.callFrames || []).slice(0, 2)) {
          for (const scope of frame.scopeChain || []) {
            if (!scope.object || !scope.object.objectId) continue;
            const props = await client.cdp.send('Runtime.getProperties', { objectId: scope.object.objectId, ownProperties: true }).catch(() => null);
            for (const p of (props && props.result) || []) {
              const v = p.value;
              if (v && v.type === 'string' && v.value && v.value.length > 4 && v.value.length < 400) {
                rec.vars.push({ where: frame.functionName + '/' + scope.type, name: p.name, len: v.value.length, value: v.value.slice(0, 200) });
              }
            }
          }
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
    await new Promise(r => setTimeout(r, 10000));
    await client.cdp.send('Debugger.setPauseOnExceptions', { state: 'none' }).catch(() => {});
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/debug-locals.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2).slice(0, 8000));
})();
