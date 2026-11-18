const fs = require('fs');
const files = [
  'C:/Users/Administrator/Downloads/deadshot/live/decoded.js',
  'C:/Users/Administrator/Downloads/deadshot/live/captured.js',
  'C:/Users/Administrator/Downloads/deadshot/live/source-readable.js',
];
const needles = ['browser extensions', 'disable your', 'extensions in order', 'extension', 'chrome-extension', 'moz-extension', 'Tampermonkey', 'tampermonkey'];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  console.log('\n===== ' + f + ' len=' + s.length + ' =====');
  for (const n of needles) {
    let i = 0, c = 0;
    while ((i = s.indexOf(n, i)) >= 0 && c < 5) {
      console.log('--- ' + n + ' @ ' + i + ' ---');
      console.log(JSON.stringify(s.slice(Math.max(0, i - 160), i + 240)));
      i += n.length; c++;
    }
    if (!c) console.log('--- ' + n + ': none');
  }
}
