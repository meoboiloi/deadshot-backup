const fs = require('fs');
const zlib = require('zlib');
const { unpack, packRaw } = require('./pkg-tool');

(async () => {
  const pkg = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(pkg);
  const gz = zlib.gzipSync(Buffer.from(text, 'utf8'), { level: 9 });
  const out = await packRaw(gz);
  fs.writeFileSync(__dirname + '/out/repack-node.pkg', out);
  console.log('text', text.length, 'gz', gz.length, 'pkg', out.length);
})();
