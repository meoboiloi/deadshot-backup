const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');
(async () => {
  const client = await connect({ port: 9222 });
  try {
    await client.goto('https://deadshot.io/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 8000));
    for (const q of ['attest', 'admission', 'playercount', 'pingtargets']) {
      const hits = await client.network.getTraffic({ url: q });
      console.log('\n###', q, 'hits', hits.length);
      for (const h of hits.slice(0, 3)) {
        console.log('req', h.method, h.url, 'status', h.status, 'id', h.id);
        if (h.postData) console.log('postData', String(h.postData).slice(0, 500));
        try {
          const b = await client.network.getResponseBody(h.id);
          console.log('resp', b.base64Encoded ? '(b64)' : '', String(b.body).slice(0, 1200));
        } catch (e) { console.log('body err', e.message); }
      }
    }
  } finally { await client.disconnect().catch(() => {}); }
})();
