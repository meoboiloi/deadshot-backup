const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const DIR = __dirname + '/out';
const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(DIR + '/index.html');
const pkg = fs.readFileSync(process.argv[2] || (DIR + '/final.pkg'));

const EARLY = fs.readFileSync(__dirname + '/early-diag.js', 'utf8');

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const logs = [];
  const reqs = [];
  try {
    client.page.on('console', m => logs.push('[console.' + m.type() + '] ' + m.text()));
    client.page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.enable');
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: EARLY });
    client.cdp.on('Network.requestWillBeSent', ev => {
      if (/pkg/.test(ev.request.url)) reqs.push({ phase: 'req', url: ev.request.url });
    });
    client.cdp.on('Network.responseReceived', ev => {
      if (/pkg/.test(ev.response.url)) reqs.push({ phase: 'res', url: ev.response.url, status: ev.response.status, mime: ev.response.mimeType, enc: ev.response.headers && ev.response.headers['content-encoding'], len: ev.response.headers && ev.response.headers['content-length'] });
    });
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
        if (/final(_legacy)?\.pkg/.test(url)) {
          await client.cdp.send('Fetch.fulfillRequest', {
            requestId: ev.requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/octet-stream' }, { name: 'Cache-Control', value: 'no-store' }],
            body: pkg.toString('base64')
          });
        } else {
          await client.cdp.send('Fetch.fulfillRequest', {
            requestId: ev.requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }, { name: 'Cache-Control', value: 'no-store' }],
            body: html.toString('base64')
          });
        }
      } catch (e) { logs.push('[fulfill] ' + e.message); }
    });

    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e => logs.push('[goto] ' + e.message));
    await new Promise(r => setTimeout(r, 12000));
    const st = await client.evaluate(`JSON.stringify({
      c: window.__C,
      r: window.__R,
      vbc: window.__VBC || 0,
      errs: window.__ERRS || [],
      rej: (window.__REJ || []).slice(0, 5),
      scripts: [...document.scripts].map(s => s.src ? ('src:' + s.src.slice(0, 60)) : ('inline:' + s.textContent.length)),
      bodyStart: (document.body.innerText || '').slice(0, 80),
      canvases: document.querySelectorAll('canvas').length,
      g2: !!window.__g2,
      pkgRes: performance.getEntriesByType('resource').filter(e => e.name.indexOf('pkg') >= 0).map(e => ({ n: e.name, size: e.transferSize, dur: Math.round(e.duration), enc: e.encodedBodySize, dec: e.decodedBodySize }))
    })`).catch(e => 'ERR ' + e.message);
    logs.push('[state] ' + st);
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/diag.log', logs.join('\n') + '\nREQS ' + JSON.stringify(reqs, null, 1), 'utf8');
  console.log(logs.slice(0, 30).join('\n'));
  console.log('REQS', JSON.stringify(reqs));
})();
