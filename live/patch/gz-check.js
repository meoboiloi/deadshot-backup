const fs = require('fs');
const zlib = require('zlib');
const { subtle } = require('crypto').webcrypto;
const KEY = Buffer.from('8e1f7618de022e14be5ac75e4a880d9bcceef3ec45be2250e243b8344126b378', 'hex');

async function plain(path) {
  const pkg = fs.readFileSync(path);
  const key = await subtle.importKey('raw', KEY, 'AES-GCM', false, ['decrypt']);
  const p = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: pkg.subarray(0, 12), tagLength: 128 }, key, pkg.subarray(12, pkg.length - 64)));
  return p;
}

(async () => {
  for (const [name, p] of [['orig', 'C:/Users/Administrator/Downloads/deadshot/live/patch/cache/final.pkg'], ['ours', 'C:/Users/Administrator/Downloads/deadshot/live/patch/out/final.pkg']]) {
    const b = await plain(p);
    const raw = zlib.gunzipSync(b);
    console.log(name, 'pkg', fs.statSync(p).size, 'gz', b.length, 'head', b.subarray(0, 12).toString('hex'), 'tail', b.subarray(-8).toString('hex'), 'gunzip', raw.length, 'isize', b.readUInt32LE(b.length - 4));
  }
})();
