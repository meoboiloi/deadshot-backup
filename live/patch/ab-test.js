// A/B test loader acceptance through CDP Fetch interception.
// usage: node ab-test.js <orig|patched> <orig|patched>
const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const pick = (kind) => {
  const orig = fs.readFileSync(__dirname + '/cache/index.html');
  if (kind === 'patched') return fs.readFileSync(__dirname + '/out/index.html');
  if (kind === 'namedstub') {
    const s = orig.toString('utf8');
    const m = /<script\b[^>]*>/i.exec(s);
    const at = m.index + m[0].length;
    const ins = '\n;(function(){try{var P=SubtleCrypto.prototype;P.verify=function verify(algorithm,key,signature,data){window.__VBC=(window.__VBC||0)+1;return Promise.resolve(true);};console.log("[DS-PATCH] namedstub");}catch(e){}})();\n';
    return Buffer.from(s.slice(0, at) + ins + s.slice(at));
  }
  if (kind === 'logonly') {
    const s = orig.toString('utf8');
    const m = /<script\b[^>]*>/i.exec(s);
    const at = m.index + m[0].length;
    const ins = '\n;console.log("[DS-PATCH] logonly");\n';
    return Buffer.from(s.slice(0, at) + ins + s.slice(at));
  }
  if (kind === 'nativefake') {
    const s = orig.toString('utf8');
    const m = /<script\b[^>]*>/i.exec(s);
    const at = m.index + m[0].length;
    const ins = '\n;(function(){try{var P=SubtleCrypto.prototype;var f=function(){return Promise.resolve(true);};f.toString=function(){return "function verify() { [native code] }";};P.verify=f;console.log("[DS-PATCH] nativefake");}catch(e){}})();\n';
    return Buffer.from(s.slice(0, at) + ins + s.slice(at));
  }
  return orig;
};
const pickPkg = (kind) => {
  if (kind === 'patched') return fs.readFileSync(__dirname + '/out/final.pkg');
  if (kind.endsWith('.pkg')) return fs.readFileSync(kind);
  return fs.readFileSync(__dirname + '/cache/final.pkg');
};

const htmlKind = process.argv[2] || 'orig';
const pkgKind = process.argv[3] || 'orig';
const html = pick(htmlKind);
const pkg = pickPkg(pkgKind);
const PORT = Number(process.env.CDP_PORT || 9222);

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
    await new Promise(r => setTimeout(r, 14000));
    const st = await client.evaluate('JSON.stringify({canvases:document.querySelectorAll("canvas").length,g2:!!window.__g2,body:(document.body.innerText||"").length})').catch(e => 'ERR ' + e.message);
    logs.push('[state] ' + st);
    await client.cdp.send('Fetch.disable').catch(() => {});
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/ab-' + htmlKind + '-' + pkgKind.split(/[\\\\/]/).pop() + '.log', logs.join('\n'), 'utf8');
  console.log('HTML=' + htmlKind + ' PKG=' + pkgKind);
  console.log(logs.filter(l => /state|DS-PATCH|pageerror|goto|fulfill/.test(l)).join('\n'));
})();

