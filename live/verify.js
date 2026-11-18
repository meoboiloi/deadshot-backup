const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const li = s.indexOf('const lixLAZ=['), lj = s.indexOf('];', li);
const lix = Function('return (' + s.slice(li + 'const lixLAZ='.length, lj + 1) + ')')();
const pi = s.indexOf('wvIEvB="');
let i = pi + 'wvIEvB='.length + 1, raw = '';
while (i < s.length) { const c = s[i]; if (c === '\\') { raw += c + s[i + 1]; i += 2; continue; } if (c === '"') break; raw += c; i++; }
const payload = JSON.parse('"' + raw + '"');
const ALPHA = 'I0[|b~EP{unx%/F}dRpKvU3zlSa@B])+7ZO"XcA*VgL24>GfT.Jy^$!(6w?eH:q<oQhi`kr_9Cm;WtN&D,=s8j5#Y1M';

function dec(str) {
  const out = [];
  let acc = 0, bits = 0, buf = -1;
  for (const ch of str) {
    const idx = ALPHA.indexOf(ch);
    if (idx === -1) continue;
    if (buf === -1) { buf = idx; continue; }
    const b = buf + idx * 91;
    acc |= b << bits;
    bits += (b & 8191) > 88 ? 13 : 14;
    while (bits > 7) { out.push(acc & 255); acc >>= 8; bits -= 8; }
    buf = -1;
  }
  if (buf > -1) out.push((acc | (buf << bits)) & 255);
  return Buffer.from(out);
}
console.log('payload len', payload.length);
console.log('--- lix[0x3d3] len lix[0x59]=', lix[0x59], '---');
let b = dec(payload.slice(lix[0x3d3], lix[0x3d3] + lix[0x59]));
console.log('bytes', b.length, JSON.stringify(b.toString('latin1')));
console.log('--- lix[0x3d4] len lix[0x63]=', lix[0x63], '---');
b = dec(payload.slice(lix[0x3d4], lix[0x3d4] + lix[0x63]));
console.log('bytes', b.length, JSON.stringify(b.toString('latin1')));
console.log('--- odd offset 0xe75b len 8, shifts ---');
for (let sh = -4; sh <= 4; sh++) {
  const o = 0xe75b + sh;
  const r = dec(payload.slice(o, o + 8));
  console.log('shift', sh, 'len', r.length, JSON.stringify(r.toString('latin1')));
}
console.log('--- lix[0x7b7] len lix[0x34]=', lix[0x34], '---');
b = dec(payload.slice(lix[0x7b7], lix[0x7b7] + lix[0x34]));
console.log('bytes', b.length, JSON.stringify(b.toString('latin1')));
console.log('--- lix[0x7b8] len lix[0x4c]=', lix[0x4c], '---');
b = dec(payload.slice(lix[0x7b8], lix[0x7b8] + lix[0x4c]));
console.log('bytes', b.length, JSON.stringify(b.toString('latin1')));
