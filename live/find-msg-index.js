const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');

// find string array function n
const nStart = s.indexOf('function n(){');
console.log('nStart', nStart);
console.log('top head', JSON.stringify(s.slice(0, 300)));
console.log('o def', JSON.stringify(s.slice(s.indexOf('function o('), s.indexOf('function o(') + 200)));

// extract array literal after "var eR6=" etc
const arrStart = s.indexOf('[', nStart);
// find matching ] with a simple scan respecting strings
let i = arrStart, depth = 0, inStr = null;
for (; i < s.length; i++) {
  const c = s[i];
  if (inStr) {
    if (c === '\\') { i++; continue; }
    if (c === inStr) inStr = null;
    continue;
  }
  if (c === "'" || c === '"') { inStr = c; continue; }
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
}
const arrText = s.slice(arrStart, i);
console.log('array literal len', arrText.length);
let arr;
try { arr = Function('return (' + arrText + ')')(); } catch (e) { console.log('parse err', e.message); process.exit(1); }
console.log('array len', arr.length);
const target = 'Please disable your browser extensions in order to play this game';
let idx = arr.indexOf(target);
console.log('target index', idx);
if (idx < 0) {
  // try escaped form
  idx = arr.findIndex(x => typeof x === 'string' && x.replace(/\\x20/g, ' ').includes('Please disable your browser'));
  console.log('target index (normalized)', idx, JSON.stringify(arr[idx]));
}
console.log('offset-0xaf =', idx + 0xaf, 'hex', '0x' + (idx + 0xaf).toString(16));

// find decoder calls with that numeric literal
const hex = '0x' + (idx + 0xaf).toString(16);
for (const name of ['e0g', 'e0f', 'o', 'eR5', 'eR6']) {
  const re = new RegExp(name + '\\(\\s*' + hex + '\\b', 'g');
  const hits = [...s.matchAll(re)];
  if (hits.length) console.log(name, hex, 'hits', hits.length, hits.slice(0, 5).map(h => h.index));
}
