// Decode deadshot final.pkg -> base source
// Usage: node decode-pkg.js [path-or-url] [outfile]
//   default input : C:\Users\Administrator\Downloads\deadshot\live\current.pkg
//   default output: C:\Users\Administrator\Downloads\deadshot\live\base-source.js
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const { webcrypto } = require('crypto');
const { subtle } = webcrypto;

const DEFAULT_KEYS = {
  aes: '8e1f7618de022e14be5ac75e4a880d9bcceef3ec45be2250e243b8344126b378',
  ed: '8809c0874c97402ccd667a85b7b644df8dce5514f15a02acfc8cfea438326f6c'
};

async function loadPkg(input) {
  if (/^https?:\/\//i.test(input)) {
    const r = await fetch(input);
    if (!r.ok) throw new Error('fetch failed ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  }
  return fs.readFileSync(input);
}

(async () => {
  const input = process.argv[2] || 'C:/Users/Administrator/Downloads/deadshot/live/current.pkg';
  const out = process.argv[3] || 'C:/Users/Administrator/Downloads/deadshot/live/base-source.js';
  let keys = DEFAULT_KEYS;
  try {
    const k = JSON.parse(fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/keys.json', 'utf8'));
    keys = { aes: k.find(x => x.alg === 'AES-GCM').hex, ed: k.find(x => x.alg === 'Ed25519').hex };
  } catch (e) {}

  const pkg = await loadPkg(input);
  const iv = pkg.subarray(0, 12);
  const sig = pkg.subarray(pkg.length - 64);
  const ct = pkg.subarray(12, pkg.length - 64);
  console.log('pkg', pkg.length, 'sha256', crypto.createHash('sha256').update(pkg).digest('hex'));
  console.log('iv', iv.toString('hex'));

  const pub = await subtle.importKey('raw', Buffer.from(keys.ed, 'hex'), 'Ed25519', false, ['verify']);
  const ok = await subtle.verify('Ed25519', pub, sig, pkg.subarray(0, pkg.length - 64));
  console.log('ed25519 signature:', ok);
  if (!ok) throw new Error('signature invalid');

  const key = await subtle.importKey('raw', Buffer.from(keys.aes, 'hex'), 'AES-GCM', false, ['decrypt']);
  const plain = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct));
  console.log('aes-gcm plaintext', plain.length, 'magic', plain.subarray(0, 4).toString('hex'));
  const raw = zlib.gunzipSync(plain);
  console.log('gunzip', raw.length);

  const text = raw.toString('utf8');
  let idx = text.indexOf('var battle_royale_enabled');
  if (idx < 0) idx = text.indexOf('battle_royale_enabled');
  if (idx < 0) throw new Error('source start not found');
  const source = text.slice(idx);
  fs.writeFileSync(out, source, 'utf8');
  console.log('prefix/map bytes:', Buffer.byteLength(text.slice(0, idx), 'utf8'));
  console.log('source chars:', source.length);
  console.log('saved', out);
})();
