const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(__dirname + '/cache/index.html');
const pkg = fs.readFileSync(process.argv[2] || (__dirname + '/out/append.pkg'));

const EXPRS = ['typeof sLk35j', 'sLk35j', 'sjHcJKb', 'typeof sjHcJKb', 'typeof Fpw6Vv', 'Fpw6Vv', 'typeof MBtp4x', 'MBtp4x && MBtp4x.length', 'typeof wvIEvB', 'typeof RW3nTYi', 'RW3nTYi && RW3nTYi.length'];

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
        const rec = { desc: ev.data && ev.data.description, fn: frame && frame.functionName, loc: frame && frame.location, scopes: [], exprs: [] };
        for (const scope of (frame && frame.scopeChain) || []) {
          const item = { type: scope.type, name: scope.name, err: null, props: [] };
          try {
            const props = await client.cdp.send('Runtime.getProperties', { objectId: scope.object.objectId, ownProperties: true });
            item.props = (props.result || []).slice(0, 40).map(p => ({ n: p.name, t: p.value && p.value.type, v: p.value && (p.value.value !== undefined ? String(p.value.value).slice(0, 120) : p.value.description) }));
          } catch (e) { item.err = String(e); }
          rec.scopes.push(item);
        }
        for (const ex of EXPRS) {
          try {
            const r = await client.cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: ex, returnByValue: true, silent: true });
            rec.exprs.push({ ex, value: r.result && (r.result.value !== undefined ? r.result.value : r.result.description), type: r.result && r.result.type, ex2: r.exceptionDetails ? 'EX' : undefined });
          } catch (e) { rec.exprs.push({ ex, err: String(e) }); }
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
  fs.writeFileSync(__dirname + '/debug-locals2.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2).slice(0, 9000));
})();
