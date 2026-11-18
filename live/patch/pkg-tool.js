// deadshot .pkg packer/unpacker
// Layout: [12-byte IV][AES-GCM ciphertext...][64-byte Ed25519 signature]
// The signature covers (IV || ciphertext). The client verifies it with an
// embedded Ed25519 public key BEFORE running the payload, so a modified pkg
// cannot be signed. Bypass it in index.html (see build.js) and the 64-byte
// tail becomes irrelevant.
//
// Usage:
//   node pkg-tool.js keys
//   node pkg-tool.js info   [pkg]
//   node pkg-tool.js unpack [pkg] [out.js]
//   node pkg-tool.js pack   [src.js] [out.pkg]
//   node pkg-tool.js roundtrip [pkg]
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const { subtle } = crypto.webcrypto;

const DIR = __dirname;
const DEFAULT_KEYS = JSON.parse(fs.readFileSync(DIR + '/keys.json', 'utf8'));
const KEYS = {
  aes: DEFAULT_KEYS.find(k => k.alg === 'AES-GCM').hex,
  ed: DEFAULT_KEYS.find(k => k.alg === 'Ed25519').hex
};

async function aesKey(usage) {
  return subtle.importKey('raw', Buffer.from(KEYS.aes, 'hex'), 'AES-GCM', false, [usage]);
}

async function unpack(pkg) {
  if (pkg.length < 12 + 64 + 16) throw new Error('pkg too short: ' + pkg.length);
  const iv = pkg.subarray(0, 12);
  const sig = pkg.subarray(pkg.length - 64);
  const ct = pkg.subarray(12, pkg.length - 64);
  const key = await aesKey('decrypt');
  const plain = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct));
  const raw = zlib.gunzipSync(plain);
  return { text: raw.toString('utf8'), raw, iv, sig, ctLen: ct.length, plainLen: plain.length };
}

async function pack(text) {
  const raw = Buffer.from(text, 'utf8');
  const gz = zlib.gzipSync(raw, { level: 9 });
  return packRaw(gz);
}

// Encrypt an already-built gzip buffer (lets us control the exact plaintext
// length, e.g. to match the original pkg byte-for-byte).
async function packRaw(gz) {
  const iv = crypto.randomBytes(12);
  const key = await aesKey('encrypt');
  const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, gz));
  return Buffer.concat([iv, ct, Buffer.alloc(64)]);
}

function readPkgArg(arg) {
  if (arg && /^https?:\/\//i.test(arg)) {
    return fetch(arg).then(r => r.arrayBuffer()).then(b => Buffer.from(b));
  }
  return Promise.resolve(fs.readFileSync(arg || DIR + '/../current.pkg'));
}

if (require.main === module) (async () => {
  const cmd = process.argv[2] || 'info';
  try {
    if (cmd === 'keys') {
      console.log(JSON.stringify(KEYS, null, 2));
      return;
    }
    if (cmd === 'info') {
      const pkg = await readPkgArg(process.argv[3]);
      const r = await unpack(pkg);
      const at = r.text.indexOf('var battle_royale_enabled');
      console.log(JSON.stringify({
        pkgLen: pkg.length,
        iv: r.iv.toString('hex'),
        sigLen: r.sig.length,
        ctLen: r.ctLen,
        gunzipLen: r.raw.length,
        textLen: r.text.length,
        sourceOffset: at,
        prefixSample: JSON.stringify(r.text.slice(0, 120)),
        sigSha256: crypto.createHash('sha256').update(r.sig).digest('hex')
      }, null, 2));
      return;
    }
    if (cmd === 'unpack') {
      const pkg = await readPkgArg(process.argv[3]);
      const r = await unpack(pkg);
      const out = process.argv[4] || DIR + '/base-source.js';
      fs.writeFileSync(out, r.text, 'utf8');
      console.log('unpacked', r.text.length, 'chars ->', out);
      return;
    }
    if (cmd === 'pack') {
      const src = fs.readFileSync(process.argv[3] || DIR + '/base-source.js', 'utf8');
      const out = process.argv[4] || DIR + '/patched.pkg';
      const pkg = await pack(src);
      fs.writeFileSync(out, pkg);
      console.log('packed', src.length, 'chars ->', out, pkg.length, 'bytes');
      return;
    }
    if (cmd === 'roundtrip') {
      const pkg = await readPkgArg(process.argv[3]);
      const a = await unpack(pkg);
      const b = await pack(a.text);
      const c = await unpack(b);
      const same = c.text === a.text;
      console.log(JSON.stringify({ original: pkg.length, repacked: b.length, textLen: a.text.length, roundtripEqual: same }, null, 2));
      if (!same) process.exitCode = 1;
      return;
    }
    console.error('unknown command: ' + cmd);
    process.exitCode = 1;
  } catch (e) {
    console.error('ERR', e && e.message || e);
    process.exitCode = 1;
  }
})();

module.exports = { unpack, pack, packRaw, KEYS };
