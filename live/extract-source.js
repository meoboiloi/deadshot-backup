const fs = require('fs');
const d = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/decoded.js', 'utf8');
const idx = d.indexOf('var battle_royale_enabled');
const src = d.slice(idx);
fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', src, 'utf8');
console.log('idx', idx, 'len', src.length, 'head', JSON.stringify(src.slice(0, 100)));
// find a few unique markers and compare with captured
const cap = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/captured.js', 'utf8');
for (const marker of ['matchmaker-socket-closed-early', 'pkgLoginWorker', 'battle_royale_enabled']) {
  const a = src.indexOf(marker), b = cap.indexOf(marker);
  console.log(marker, 'readable@', a, 'captured@', b);
  if (a > 0 && b > 0) console.log('  R:', JSON.stringify(src.slice(a - 60, a + 60)));
  if (b > 0) console.log('  C:', JSON.stringify(cap.slice(b - 60, b + 60)));
}
