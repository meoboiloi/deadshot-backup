const fs = require('fs');
const zlib = require('zlib');
const { webcrypto } = require('crypto');
const { subtle } = webcrypto;
const crypto = require('crypto');

(async () => {
  for (const f of ['final.pkg', 'current.pkg']) {
    const b = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/' + f);
    console.log(f, b.length, crypto.createHash('sha256').update(b).digest('hex'));
  }
  const pkg = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/current.pkg');
  const keys = JSON.parse(fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/keys.json', 'utf8'));
  const key = await subtle.importKey('raw', Buffer.from(keys.find(k => k.alg === 'AES-GCM').hex, 'hex'), 'AES-GCM', false, ['decrypt']);
  const pt = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: pkg.subarray(0, 12), tagLength: 128 }, key, pkg.subarray(12, pkg.length - 64)));
  const raw = zlib.gunzipSync(pt);
  console.log('pt', pt.length, 'raw', raw.length);
  const text = raw.toString('utf8');
  let idx = 0, hits = [];
  while ((idx = text.indexOf('battle_royale_enabled', idx)) >= 0) { hits.push(idx); idx += 5; }
  console.log('occurrences', hits.slice(0, 8));
  for (const h of hits.slice(0, 5)) console.log('at', h, JSON.stringify(text.slice(h - 40, h + 80)));
  console.log('at 641823', JSON.stringify(text.slice(641823, 642023)));
  fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/current-decoded.bin', raw);
})();
