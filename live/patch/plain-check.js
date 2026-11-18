const fs = require('fs');
const zlib = require('zlib');
const { subtle } = require('crypto').webcrypto;

(async () => {
  const pkg = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/patch/out/final.pkg');
  const iv = pkg.subarray(0, 12);
  const ct = pkg.subarray(12, pkg.length - 64);
  const key = await subtle.importKey('raw', Buffer.from('8e1f7618de022e14be5ac75e4a880d9bcceef3ec45be2250e243b8344126b378', 'hex'), 'AES-GCM', false, ['decrypt']);
  const plain = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct));
  console.log('plain', plain.length, 'magic', plain.subarray(0, 12).toString('hex'));

  // Node zlib
  const nz = zlib.gunzipSync(plain);
  console.log('zlib gunzip', nz.length);

  // Browser-equivalent stream
  const ds = new DecompressionStream('gzip');
  const out = Buffer.from(await new Response(new Blob([plain]).stream().pipeThrough(ds)).arrayBuffer());
  console.log('DecompressionStream', out.length, 'equal', out.length === nz.length);

  const text = out.toString('utf8');
  console.log('text len', text.length, 'head', JSON.stringify(text.slice(0, 80)));
  const at = text.indexOf('var battle_royale_enabled');
  console.log('source offset', at, 'source head', JSON.stringify(text.slice(at, at + 60)));
  // what happens at the 108472 mark?
  console.log('@108472', JSON.stringify(text.slice(108400, 108560)));
  // count newlines / structure markers in prefix
  const prefix = text.slice(0, at);
  console.log('prefix len', prefix.length, 'prefix end', JSON.stringify(prefix.slice(-120)));
})();
