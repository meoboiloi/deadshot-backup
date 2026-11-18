const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
let i = 0;
const found = [];
while (i < s.length) {
  const c = s[i];
  if (c === '"' || c === "'") {
    const q = c;
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === q) break;
      j++;
    }
    const len = j - i - 1;
    if (len > 5000) found.push({ pos: i, len, head: s.slice(i + 1, i + 61), tail: s.slice(j - 40, j) });
    i = j + 1;
  } else if (c === '/' && s[i + 1] === '/') {
    i = s.indexOf('\n', i); if (i < 0) break;
  } else if (c === '/' && s[i + 1] === '*') {
    i = s.indexOf('*/', i); if (i < 0) break; i += 2;
  } else i++;
}
console.log('large string literals:', found.length);
for (const f of found) console.log(JSON.stringify(f).slice(0, 300));
