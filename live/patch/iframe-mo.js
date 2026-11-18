const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const html = fs.readFileSync(__dirname + '/cache/index.html');
const pkg = fs.readFileSync(__dirname + '/cache/final.pkg');

const EARLY = `(() => {
  window.__MO = [];
  try {
    new MutationObserver(list => {
      for (const m of list) for (const n of m.addedNodes) {
        try { if (n && n.tagName) window.__MO.push(n.tagName + (n.tagName === 'IFRAME' ? '|src=' + (n.src || '') + '|cd=' + (n.contentDocument ? n.contentDocument.childNodes.length : 'null') : '')); } catch (e) {}
      }
    }).observe(document, { childList: true, subtree: true });
  } catch (e) { window.__MOERR = String(e); }
})();`;

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: EARLY });
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
    await new Promise(r => setTimeout(r, 6000));
    const st = await client.evaluate('JSON.stringify({canvases:document.querySelectorAll("canvas").length,mo:(window.__MO||[]).slice(0,60),err:window.__MOERR||null,iframes:[...document.querySelectorAll("iframe")].map(f=>({src:(f.src||"").slice(0,40),name:f.name,cd:!!f.contentDocument}))})').catch(e => 'ERR ' + e.message);
    console.log(st);
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
})();
