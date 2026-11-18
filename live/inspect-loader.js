const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');
console.log('bytes', s.length, 'lines', s.split(/\r?\n/).length);
console.log('--- head 600 ---');
console.log(s.slice(0, 600));
console.log('--- tail 600 ---');
console.log(s.slice(-600));

const terms = ['TextDecoder', 'fromCharCode', 'Function(', 'lixLAZ', 'return ', 'async ', 'await ', 'l16vC8', 'ed25519', 'Ed25519', 'signature', 'verify'];
for (const t of terms) {
  const idx = s.indexOf(t);
  if (idx >= 0) {
    console.log(`\n=== ${t} @ ${idx} ===`);
    console.log(s.slice(Math.max(0, idx - 250), idx + 350).replace(/\s+/g, ' '));
  }
}

// long string literals
let best = [];
const re = /(["'])((?:(?!\1)[^\\]|\\.){500,})\1/g;
let m;
while ((m = re.exec(s)) && best.length < 8) {
  best.push({ len: m[2].length, head: m[2].slice(0, 80) });
}
console.log('\nlong strings:', JSON.stringify(best, null, 1));
