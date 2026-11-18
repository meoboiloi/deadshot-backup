const fs = require('fs');
for (const file of process.argv.slice(2)) {
  const s = fs.readFileSync(file, 'utf8');
  const anchor = s.indexOf('game2.spectating=packet2.s');
  if (anchor < 0) { console.log(file, 'anchor not found'); continue; }
  const eq = s.lastIndexOf('={', anchor);
  const nameStart = s.lastIndexOf('game2.', eq);
  const name = s.slice(nameStart + 6, eq);
  let i = eq + 1, depth = 0, q = null, keys = [], key = '', expect = true;
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
  console.log(JSON.stringify({ file, table: name, keys }));
}
