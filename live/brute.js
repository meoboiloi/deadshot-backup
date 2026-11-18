const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const li = s.indexOf('const lixLAZ=['), lj = s.indexOf('];', li);
const lix = Function('return (' + s.slice(li + 14, lj + 1) + ')')();
const pi = s.indexOf('wvIEvB="');
let i = pi + 10, raw = '';
while (i < s.length) { const c = s[i]; if (c === '\\') { raw += c + s[i+1]; i += 2; continue; } if (c === '"') break; raw += c; i++; }
const payload = JSON.parse('"' + raw + '"');
const ALPHA = s.slice(s.indexOf('wvIEvB[lixLAZ[0x5]]="') + 20, s.indexOf('",wvIEvB[lixLAZ[0x0]]'));
console.log('alphabet len', ALPHA.length);

const variants = [];
for (const order of ['accFirst', 'bitsFirst'])
for (const bufForm of ['i1+i2*91', 'i2+i1*91', 'i1+i2*64', 'i2+i1*64', 'i1*91+i2', 'i1*64+i2'])
for (const width of ['gt88_13_14', 'ge88_13_14', 'gt88_14_13', 'fixed13', 'fixed14'])
for (const loop of ['gt7', 'ge8'])
for (const finalPush of ['or', 'none'])
  variants.push({ order, bufForm, width, loop, finalPush });

function decode(v) {
  const out = [];
  let acc = 0, bits = 0, buf = -1;
  for (const ch of payload) {
    const idx = ALPHA.indexOf(ch);
    if (idx === -1) continue;
    if (buf === -1) { buf = idx; continue; }
    let b;
    if (v.bufForm === 'i1+i2*91') b = buf + idx * 91;
    else if (v.bufForm === 'i2+i1*91') b = idx + buf * 91;
    else if (v.bufForm === 'i1+i2*64') b = buf + idx * 64;
    else if (v.bufForm === 'i2+i1*64') b = idx + buf * 64;
    else if (v.bufForm === 'i1*91+i2') b = buf * 91 + idx;
    else b = buf * 64 + idx;
    let w;
    if (v.width === 'gt88_13_14') w = (b & 8191) > 88 ? 13 : 14;
    else if (v.width === 'ge88_13_14') w = (b & 8191) >= 88 ? 13 : 14;
    else if (v.width === 'gt88_14_13') w = (b & 8191) > 88 ? 14 : 13;
    else if (v.width === 'fixed13') w = 13;
    else w = 14;
    if (v.order === 'accFirst') { acc |= b << bits; bits += w; }
    else { bits += w; acc |= b << bits; }
    const cond = v.loop === 'gt7' ? () => bits > 7 : () => bits >= 8;
    while (cond()) { out.push(acc & 255); acc >>= 8; bits -= 8; }
    buf = -1;
  }
  if (v.finalPush === 'or' && buf > -1) out.push((acc | (buf << bits)) & 255);
  return Buffer.from(out);
}
function score(buf) {
  let printable = 0, ascii = 0, nul = 0;
  for (const b of buf) { if (b >= 32 && b !== 127 && b < 127) ascii++; if (b >= 32 || b === 10 || b === 9 || b === 13) printable++; if (b === 0) nul++; }
  return { ascii: ascii / buf.length, printable: printable / buf.length, nul: nul / buf.length };
}
const scored = variants.map(v => { const b = decode(v); return { v, ...score(b), len: b.length, head: b.slice(0, 60).toString() }; });
scored.sort((a, b) => b.printable - a.printable);
for (const r of scored.slice(0, 10)) {
  console.log(JSON.stringify(r.v), 'printable=', r.printable.toFixed(3), 'ascii=', r.ascii.toFixed(3), 'nul=', r.nul.toFixed(3), 'head=', JSON.stringify(r.head));
}
