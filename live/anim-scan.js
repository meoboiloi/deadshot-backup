const fs = require('fs');
for (const f of ['source-readable.js', 'captured.js']) {
  const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/' + f, 'utf8');
  console.log('\n===== ' + f + ' =====');
  for (const t of ['RunSideways2', "HomeAnim", "AnimationMixer", "Jump"]) {
    let i = 0, c = 0;
    console.log('\n### ' + t);
    while ((i = s.indexOf(t, i)) >= 0 && c < 4) {
      if (i > 500000) console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - 700), i + 900)));
      i += t.length; c++;
    }
    if (!c) console.log('none');
  }
}
