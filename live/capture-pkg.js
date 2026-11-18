const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222 });
  try {
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 6000));
    const hits = await client.network.getTraffic({ url: 'final.pkg' });
    console.log('keys', hits[0] && Object.keys(hits[0]));
    console.log('hits', hits.length, hits.map(h => ({ id: h.requestId, url: h.url, status: h.status })).slice(0, 3));
    if (!hits.length) return;
    const rid = hits[0].requestId || hits[0].id;
    console.log('rid', rid);
    const body = await client.network.getResponseBody(rid);
    console.log('body base64?', body.base64Encoded, 'len', body.body.length);
    const buf = Buffer.from(body.body, 'base64');
    fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/current.pkg', buf);
    console.log('saved current.pkg', buf.length, 'magic', buf.subarray(0, 12).toString('hex'));
  } finally {
    await client.disconnect().catch(() => {});
  }
})();

