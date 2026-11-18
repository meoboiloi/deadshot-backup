const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const start = s.indexOf('game2.l1IΙIιӏІlΙ={') >= 0 ? s.indexOf('game2.l1IΙIιӏІlΙ={') : s.indexOf('game2.R3485_x6={');
if (start < 0) { console.log('table not found'); process.exit(1); }
let i = s.indexOf('{', start), depth = 0, q = null, keys = [], key = '', expect = true;
for (; i < s.length; i++) {
  const c = s[i];
  if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
  if (c === "'" || c === '"') { q = c; continue; }
  if (c === '{') { depth++; continue; }
  if (c === '}') { depth--; if (depth === 0) break; continue; }
  if (depth === 1) {
    if (expect && /[A-Za-z0-9_$\u0080-\uffff]/.test(c)) key += c;
    else if (expect && c === ':') { keys.push(key); key = ''; expect = false; }
    else if (c === ',') { expect = true; key = ''; }
  }
}
console.log(JSON.stringify({ file: process.argv[2], keys }));
