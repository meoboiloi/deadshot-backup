const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const li = s.indexOf('const lixLAZ=['), lj = s.indexOf('];', li);
const lix = Function('return (' + s.slice(li + 'const lixLAZ='.length, lj + 1) + ')')();
const pi = s.indexOf('wvIEvB="');
let i = pi + 10, raw = '';
while (i < s.length) { const c = s[i]; if (c === '\\') { raw += c + s[i + 1]; i += 2; continue; } if (c === '"') break; raw += c; i++; }
const payload = JSON.parse('"' + raw + '"');
const ALPHA = 'I0[|b~EP{unx%/F}dRpKvU3zlSa@B])+7ZO"XcA*VgL24>GfT.Jy^$!(6w?eH:q<oQhi`kr_9Cm;WtN&D,=s8j5#Y1M';
console.log('alpha', ALPHA.length, 'lix[0x59]=', lix[0x59], 'lix[0x3d3]=', lix[0x3d3], 'lix[0x3d4]=', lix[0x3d4]);

const offset = lix[0x3d3], len = lix[0x59];
const chunk = payload.slice(offset, offset + len);
console.log('chunk len', chunk.length, JSON.stringify(chunk.slice(0, 40)));

function decode(chunk, initBits, widthMode, order) {
  const out = [];
  let acc = 0, bits = initBits, buf = -1;
  for (const ch of chunk) {
    const idx = ALPHA.indexOf(ch);
    if (idx === -1) continue;
    if (buf === -1) { buf = idx; continue; }
    const b = buf + idx * 91;
    let w;
    if (widthMode === 'gt88') w = (b & 8191) > 88 ? 13 : 14;
    else if (widthMode === 'ge88') w = (b & 8191) >= 88 ? 13 : 14;
    else if (widthMode === 'lt88') w = (b & 8191) < 88 ? 13 : 14;
    else if (widthMode === 'gt0') w = (b & 8191) > 0 ? 13 : 14;
    else if (widthMode === 'fixed13') w = 13;
    else if (widthMode === 'fixed14') w = 14;
    else if (widthMode === 'byval') w = b > 88 ? 13 : 14;
    else if (widthMode === 'hi') w = b >= 8192 ? 14 : 13;
    if (order === 'accFirst') { acc |= b << bits; bits += w; }
    else { bits += w; acc |= b << bits; }
    while (bits > 7) { out.push(acc & 255); acc >>= 8; bits -= 8; }
    buf = -1;
  }
  if (buf > -1) out.push((acc | (buf << bits)) & 255);
  return Buffer.from(out);
}
function score(buf) {
  let a = 0;
  for (const b of buf) if (b >= 32 && b < 127) a++;
  return a / Math.max(1, buf.length);
}
const rows = [];
for (const init of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  for (const wm of ['gt88', 'ge88', 'lt88', 'gt0', 'fixed13', 'fixed14', 'byval', 'hi'])
    for (const order of ['accFirst', 'bitsFirst']) {
      const buf = decode(chunk, init, wm, order);
      rows.push({ init, wm, order, sc: score(buf), head: buf.slice(0, 45).toString('latin1'), len: buf.length });
    }
rows.sort((a, b) => b.sc - a.sc);
for (const r of rows.slice(0, 12)) console.log(JSON.stringify({ init: r.init, wm: r.wm, order: r.order, sc: r.sc.toFixed(3), len: r.len, head: r.head }));
