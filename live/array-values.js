const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');
const n = s.indexOf('function n(){');
const a = s.indexOf('[', n);
let i = a, d = 0, q = null;
for (; i < s.length; i++) {
  const c = s[i];
  if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
  if (c === "'" || c === '"') { q = c; continue; }
  if (c === '[') d++; else if (c === ']') { d--; if (d === 0) { i++; break; } }
}
const arr = Function('return (' + s.slice(a, i) + ')')();
console.log('len', arr.length);
for (const idx of [506, 4581, 2000, 3000, 4000, 5000]) console.log(idx, JSON.stringify(arr[idx]));
const hits = [];
arr.forEach((v, k) => { if (typeof v === 'string' && v.includes('browser extensions')) hits.push([k, v]); });
console.log('hits', JSON.stringify(hits));
for (const off of [0xaf, 0x100, 0x200, 0x800, 0x1000]) {
  console.log('literal 0x1294 with offset 0x' + off.toString(16), '=> idx', 0x1294 - off, JSON.stringify(arr[0x1294 - off]));
}
