const fs = require('fs');
const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');

const li = s.indexOf('const lixLAZ=[');
const lj = s.indexOf('];', li);
const lix = Function('return (' + s.slice(li + 'const lixLAZ='.length, lj + 1) + ')')();

const pi = s.indexOf('wvIEvB="');
let i = pi + 'wvIEvB='.length + 1, raw = '';
while (i < s.length) {
  const c = s[i];
  if (c === '\\') { raw += c + s[i + 1]; i += 2; continue; }
  if (c === '"') break;
  raw += c; i++;
}
let payload;
try { payload = JSON.parse('"' + raw + '"'); }
catch (e) { payload = Function('return "' + raw + '"')(); }

console.log('constants:', JSON.stringify({
  one: lix[1], two: lix[2], c3: lix[3], five: lix[8], f: lix[9],
  b11: lix[11], i1e: lix[0x1e], i21: lix[0x21], i22: lix[0x22], i23: lix[0x23], i24: lix[0x24], i15: lix[0x15]
}));

const ALPHA = "I0[|b~EP{unx%/F}dRpKvU3zlSa@B])+7ZO\"XcA*VgL24>GfT.Jy^$!(6w?eH:q<oQhi`kr_9Cm;WtN&D,=s8j5#Y1M";
function hiR(str) {
  const out = [];
  let acc = 0, bits = 0, buf = -1;
  for (const ch of str) {
    const idx = ALPHA.indexOf(ch);
    if (idx === -1) continue;
    if (buf === -1) { buf = idx; }
    else {
      buf += idx * 91;
      acc |= buf << bits;
      bits += ((buf & 8191) > 88) ? 13 : 14;
      do { out.push(acc & 255); acc >>= 8; bits -= 8; } while (bits > 7);
      buf = -1;
    }
  }
  if (buf > -1) out.push((acc | (buf << bits)) & 255);
  return Buffer.from(out).toString('utf8');
}
function LG(off, lenIdx) {
  const len = typeof lenIdx === 'number' ? lenIdx : lix[lenIdx];
  return hiR(payload.slice(off, off + len));
}

console.log('payload', payload.length);
for (const [label, off, len] of [
  ['ctor(0xe75b,8)', 0xe75b, 3],
  ['0x16f', lix[0x16f], 3],
  ['lix[0x3d3]', lix[0x3d3], 0x59],
  ['lix[0x3d4]', lix[0x3d4], 0x63],
  ['lix[0x681]', lix[0x681], 0x33],
  ['lix[0x682]', lix[0x682], 3],
  ['lix[0x683]', lix[0x683], 0x33],
  ['0xe79a', 0xe79a, 0xf5],
  ['lix[0x7b7]', lix[0x7b7], 0x34],
  ['lix[0x7b8]', lix[0x7b8], 0x4c],
]) {
  console.log(label, '=>', JSON.stringify(LG(off, len)));
}
