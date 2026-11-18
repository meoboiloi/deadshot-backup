const fs = require('fs');
const zlib = require('zlib');
const { webcrypto } = require('crypto');
const { subtle } = webcrypto;

(async () => {
  const pkg = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/final.pkg');
  const keys = JSON.parse(fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/keys.json', 'utf8'));
  const aesHex = keys.find(k => k.alg === 'AES-GCM').hex;
  const edHex = keys.find(k => k.alg === 'Ed25519').hex;

  const iv = pkg.subarray(0, 12);
  const sig = pkg.subarray(pkg.length - 64);
  const ct = pkg.subarray(12, pkg.length - 64);
  console.log('pkg', pkg.length, 'iv', iv.toString('hex'), 'sig', sig.length, 'ct', ct.length);

  // verify Ed25519 over iv||ct (everything but the trailing signature)
  const pub = await subtle.importKey('raw', Buffer.from(edHex, 'hex'), 'Ed25519', false, ['verify']);
  const signed = pkg.subarray(0, pkg.length - 64);
  const ok = await subtle.verify('Ed25519', pub, sig, signed);
  console.log('signature valid:', ok);

  const key = await subtle.importKey('raw', Buffer.from(aesHex, 'hex'), 'AES-GCM', false, ['decrypt']);
  const pt = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct));
  console.log('decrypted', pt.length, 'magic', pt.subarray(0, 4).toString('hex'));

  const raw = zlib.gunzipSync(pt);
  console.log('gunzipped', raw.length, 'head', JSON.stringify(raw.subarray(0, 80).toString()));
  fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/decoded.js', raw);
  console.log('saved decoded.js');
})();
