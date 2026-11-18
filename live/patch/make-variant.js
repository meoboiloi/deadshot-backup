const fs = require('fs');
const zlib = require('zlib');
const { unpack, packRaw } = require('./pkg-tool');

(async () => {
  const pkg = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(pkg);
  const mode = process.argv[2] || 'append';
  let s = text;
  if (mode === 'append') s = text + '\n/*ds*/';
  else if (mode === 'head') s = '/*ds*/' + text;
  else if (mode === 'samelength') s = text.slice(0, -1) + ' ';
  const gz = zlib.gzipSync(Buffer.from(s, 'utf8'), { level: 9 });
  const out = await packRaw(gz);
  fs.writeFileSync(__dirname + '/out/' + mode + '.pkg', out);
  console.log(mode, 'text', s.length, 'delta', s.length - text.length, 'gz', gz.length);
})();
