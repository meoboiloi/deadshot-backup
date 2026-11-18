const fs = require('fs');
const { subtle } = require('crypto').webcrypto;
const { packRaw, KEYS } = require('./pkg-tool');

(async () => {
  const pkg = fs.readFileSync(__dirname + '/cache/final.pkg');
  const key = await subtle.importKey('raw', Buffer.from(KEYS.aes, 'hex'), 'AES-GCM', false, ['decrypt']);
  const plain = Buffer.from(await subtle.decrypt({
    name: 'AES-GCM', iv: pkg.subarray(0, 12), tagLength: 128
  }, key, pkg.subarray(12, pkg.length - 64)));
  const out = await packRaw(plain);
  fs.writeFileSync(__dirname + '/out/repack-same.pkg', out);
  console.log('plain', plain.length, 'pkg', out.length);
})();
