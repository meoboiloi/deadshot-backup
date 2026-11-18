const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  const seen = [];
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Network.enable');
    await client.cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
    client.cdp.on('Network.responseReceived', async ev => {
      const u = ev.response.url;
      if (/attest|integrity|pkg|checksum|hash/i.test(u)) {
        try {
          const b = await client.cdp.send('Network.getResponseBody', { requestId: ev.requestId });
          const body = b.base64Encoded ? Buffer.from(b.body, 'base64').toString('utf8') : b.body;
          seen.push({ url: u, status: ev.response.status, mime: ev.response.mimeType, len: body.length, body: body.slice(0, 600) });
        } catch (e) { seen.push({ url: u, err: String(e) }); }
      }
    });
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 12000));
  } finally { await client.disconnect().catch(() => {}); }
  fs.writeFileSync(__dirname + '/attest.json', JSON.stringify(seen, null, 2), 'utf8');
  console.log(JSON.stringify(seen, null, 2).slice(0, 7000));
})();
