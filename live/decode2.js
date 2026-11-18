const fs = require('fs');
const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');

// ---- extract lixLAZ ----
const li = s.indexOf('const lixLAZ=[');
const lj = s.indexOf('];', li);
const arrText = s.slice(li + 'const lixLAZ='.length, lj + 1);
let lix;
try { lix = Function('return (' + arrText + ')')(); }
catch (e) { console.error('lixLAZ parse failed', e.message); process.exit(1); }
console.log('lixLAZ length', lix.length);

// ---- extract payload string ----
const pi = s.indexOf('wvIEvB="');
const startQuote = pi + 'wvIEvB='.length;
let i = startQuote + 1, raw = '';
while (i < s.length) {
  const c = s[i];
  if (c === '\\') { raw += c + s[i + 1]; i += 2; continue; }
  if (c === '"') break;
  raw += c; i++;
}
let payload;
try { payload = JSON.parse('"' + raw + '"'); }
catch (e) { payload = Function('return "' + raw + '"')(); }
console.log('payload chars', payload.length);

// ---- custom base64 decoder ----
const ALPHA = "I0[|b~EP{unx%/F}dRpKvU3zlSa@B])+7ZO\"XcA*VgL24>GfT.Jy^$!(6w?eH:q<oQhi`kr_9Cm;WtN&D,=s8j5#Y1M";
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const MAP = {};
for (let k = 0; k < ALPHA.length; k++) MAP[ALPHA[k]] = STD[k];

function hiR(str) {
  let mapped = '';
  for (const ch of str) {
    const m = MAP[ch];
    if (m !== undefined) mapped += m;
  }
  while (mapped.length % 4) mapped += '=';
  return Buffer.from(mapped, 'base64').toString('utf8');
}
function LG(off, len) {
  const n = typeof len === 'number' ? len : lix[len];
  return hiR(payload.slice(off, off + n));
}

// sanity checks
console.log('LG(0x16f,lixLAZ[3]) =', JSON.stringify(LG(lix[0x16f], lix[3])));
console.log('LG(lixLAZ[0x3d3],lixLAZ[0x59]) =', JSON.stringify(LG(lix[0x3d3], lix[0x59])));
console.log('LG(lixLAZ[0x3d4],lixLAZ[0x63]) =', JSON.stringify(LG(lix[0x3d4], lix[0x63])));

// ---- resolve creation site ----
const probe = (name, off, lenIdx) => {
  const len = typeof lenIdx === 'number' ? lix[lenIdx] : lenIdx;
  console.log(name, '=>', JSON.stringify(LG(off, len)));
};
console.log('\n--- constructor / args ---');
probe('ctor A', 0xe75b, 0x3);
console.log('ctor B (lixLAZ[0x1bc]) =', JSON.stringify(lix[0x1bc]));
for (const k of [0x681, 0x682, 0x683, 0x684, 0x685, 0x686, 0x687, 0x688, 0x689, 0x68a, 0x68b, 0x68c, 0x68d, 0x68e, 0x68f]) {
  console.log('lixLAZ[0x' + k.toString(16) + ']=', JSON.stringify(lix[k]), '=>', JSON.stringify(LG(lix[k], lix[0x33])));
}
