// Rebuild the proven same-length, single-flag experiment from a matched cache pair.
// Usage: node build-minimal.js [--install]
// --install places the results in vai-lon-ds/assets for its existing response handler.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { packRaw, unpack } = require('./pkg-tool');

const cache = path.join(__dirname, 'cache');
const out = path.join(__dirname, 'out');
const assets = path.join(__dirname, '../../vai-lon-ds/assets');

function replaceOnce(data, before, after) {
  if (before.length !== after.length || data.indexOf(before) < 0 ||
      data.indexOf(before, data.indexOf(before) + 1) >= 0) {
    throw new Error(`Expected exactly one same-length anchor: ${before}`);
  }
  const copy = Buffer.from(data);
  after.copy(copy, copy.indexOf(before));
  return copy;
}

async function main() {
  const html = fs.readFileSync(path.join(cache, 'index.html'), 'utf8');
  const original = await unpack(fs.readFileSync(path.join(cache, 'final.pkg')));
  const before = Buffer.from('var battle_royale_enabled=false;');
  const after = Buffer.from('var battle_royale_enabled=true ;');
  const raw = replaceOnce(original.raw, before, after);
  const pkg = await packRaw(zlib.gzipSync(raw, { level: 9 }));
  if (!(await unpack(pkg)).raw.equals(raw)) throw new Error('Pkg roundtrip mismatch');

  const guards = [
    ['if(!Fpw6Vv){throw', 'if(!1){throw'],
    ['if(yBqEh3s===amjxY4[I0Dy3ft(0xd20,lixLAZ[0x3])])', 'if(!1)'],
  ];
  let patchedHtml = html;
  for (const [find, replacement] of guards) {
    if (patchedHtml.split(find).length !== 2) throw new Error(`Expected one HTML guard: ${find}`);
    patchedHtml = patchedHtml.replace(find, replacement);
  }

  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'minimal-index.html'), patchedHtml);
  fs.writeFileSync(path.join(out, 'minimal-logic.pkg'), pkg);
  if (process.argv.includes('--install')) {
    fs.writeFileSync(path.join(assets, 'index.html'), patchedHtml);
    fs.writeFileSync(path.join(assets, 'final.pkg'), pkg);
    fs.writeFileSync(path.join(assets, 'final_legacy.pkg'), pkg);
  }
  console.log(JSON.stringify({
    rawBytes: raw.length, changedBytes: [...raw].reduce((n, byte, i) => n + (byte !== original.raw[i]), 0),
    htmlBytes: Buffer.byteLength(patchedHtml), pkgBytes: pkg.length,
    installed: process.argv.includes('--install'),
  }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
