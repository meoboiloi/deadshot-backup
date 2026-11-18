const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/captured.js', 'utf8');
const start = s.indexOf('game2.l1IΙIιӏІlΙ={');
console.log('table start', start);
if (start < 0) process.exit(1);
let i = s.indexOf('{', start), depth = 0, q = null, keys = [], expectKey = true, keyStart = -1;
for (; i < s.length; i++) {
  const c = s[i];
  if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
  if (c === "'" || c === '"') { if (depth === 1 && expectKey) keyStart = i + 1; q = c; continue; }
  if (c === '{') { depth++; if (depth === 1) expectKey = true; continue; }
  if (c === '}') { depth--; if (depth === 0) break; continue; }
  if (depth === 1) {
    if (c === ':') {
      if (keyStart >= 0) { keys.push(s.slice(keyStart, i)); keyStart = -1; }
      expectKey = false;
    } else if (c === ',') {
      expectKey = true; keyStart = -1;
    } else if (expectKey && /[A-Za-z0-9_$\u0080-\uffff]/.test(c)) {
      if (keyStart < 0) keyStart = i;
    } else if (expectKey && keyStart >= 0 && !/[A-Za-z0-9_$\u0080-\uffff]/.test(c)) {
      keyStart = -1;
    }
  }
}
console.log('keys', keys.length, JSON.stringify(keys));
