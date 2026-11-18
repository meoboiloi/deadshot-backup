const fs = require('fs');
for (const f of ['source-readable.js', 'captured.js']) {
  const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/' + f, 'utf8');
  console.log('\n=== ' + f + ' ===');
  for (const n of ['spectator', 'player', 'Fmj0_2mk', 'іiΙӏ1іΙiI']) {
    let i = 0, c = 0;
    console.log('--- ' + n);
    while ((i = s.indexOf(n, i)) >= 0 && c < 6) {
      console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - 160), i + 220)));
      i += n.length; c++;
    }
    if (!c) console.log('none');
  }
}
