const fs = require('fs');
const zlib = require('zlib');
const { webcrypto } = require('crypto');
const { subtle } = webcrypto;

(async () => {
  const pkg = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/final.pkg');
  const keys = JSON.parse(fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/keys.json', 'utf8'));
  const key = await subtle.importKey('raw', Buffer.from(keys.find(k => k.alg === 'AES-GCM').hex, 'hex'), 'AES-GCM', false, ['decrypt']);
  const pt = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: pkg.subarray(0, 12), tagLength: 128 }, key, pkg.subarray(12, pkg.length - 64)));
  console.log('pt', pt.length);
  const magics = [];
  for (let i = 0; i + 2 < pt.length; i++) if (pt[i] === 0x1f && pt[i + 1] === 0x8b && pt[i + 2] === 0x08) magics.push(i);
  console.log('gzip magic offsets', magics);
  for (const off of magics) {
    try {
      const out = zlib.gunzipSync(pt.subarray(off));
      console.log('off', off, 'out', out.length, 'head', JSON.stringify(out.subarray(0, 90).toString()));
      fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/member-' + off + '.bin', out);
    } catch (e) {
      console.log('off', off, 'err', e.message);
    }
  }
})();
