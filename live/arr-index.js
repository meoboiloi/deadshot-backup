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
for (const idx of [131, 0x132 - 0xaf]) console.log(idx, JSON.stringify(arr[idx]));
