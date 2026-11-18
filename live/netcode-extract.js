const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');

function ctx(needle, before = 400, after = 900, max = 5) {
  console.log('\n### ' + needle);
  let i = 0, c = 0;
  while ((i = s.indexOf(needle, i)) >= 0 && c < max) {
    console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - before), i + after)));
    i += needle.length; c++;
  }
  if (!c) console.log('none');
}
ctx('"spectator"');
ctx('"player"');
ctx('game2.types[');
ctx('game2.R3485_x6=', 300, 2200, 1);
ctx('game2.update=function', 100, 1600, 1);
