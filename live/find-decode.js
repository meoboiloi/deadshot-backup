const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');

function ctx(idx, before, after, label) {
  console.log(`\n=== ${label} @ ${idx} ===`);
  console.log(s.slice(Math.max(0, idx - before), idx + after));
}

// locate the giant payload assignment
for (const needle of ['wvIEvB="$', 'wvIEvB="', 'function HiR_NR', 'HiR_NR=', 'function yBqEh3s', 'yBqEh3s=']) {
  let i = s.indexOf(needle);
  console.log('\n>>> needle', JSON.stringify(needle), 'at', i);
  if (i >= 0) ctx(i, 200, 400, needle);
}

// extract giant string
const start = s.indexOf('wvIEvB="');
if (start >= 0) {
  const q = start + 'wvIEvB="'.length - 1;
  let i = q + 1, out = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') { out += s[i] + s[i+1]; i += 2; continue; }
    if (c === '"') break;
    out += c; i++;
  }
  console.log('\nPAYLOAD LENGTH', out.length, 'raw len', i - q);
  console.log('PAYLOAD HEAD', JSON.stringify(out.slice(0, 200)));
  console.log('PAYLOAD TAIL', JSON.stringify(out.slice(-100)));
}

// candidate alphabets: 64+ char strings with many unique chars
const re = /(["'])((?:(?!\1)[^\\]|\\.){64,200})\1/g;
let m, found = 0;
while ((m = re.exec(s)) && found < 20) {
  const t = m[2];
  const uniq = new Set(t).size;
  if (uniq >= 60 && uniq <= 70 && !/^[0-9a-fx,]+$/.test(t)) {
    console.log('\nALPHABET? uniq=' + uniq + ' len=' + t.length + ' ' + JSON.stringify(t));
    found++;
  }
}
