const fs = require('fs');
for (const f of ['C:/Users/Administrator/Downloads/deadshot/live/captured.js', 'C:/Users/Administrator/Downloads/deadshot/live/source-readable.js']) {
  const s = fs.readFileSync(f, 'utf8');
  console.log('\n===== ' + f + ' =====');
  for (const n of ['gcalenpjmijncebpfijmoaglllgpjagf', 'jinjaccalgkegednnccohejagnlnfdag', 'Please\\x20disable', 'Please disable', 'cW0']) {
    let i = 0, c = 0;
    console.log('--- ' + n);
    while ((i = s.indexOf(n, i)) >= 0 && c < 4) {
      console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - 350), i + 500)));
      i += n.length; c++;
    }
    if (!c) console.log('none');
  }
}
