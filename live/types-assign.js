const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');
const re = /game2\.types\[[^\]]+\]\s*=/g;
let m, c = 0;
while ((m = re.exec(s)) && c < 20) {
  console.log('@' + m.index + ': ' + JSON.stringify(s.slice(Math.max(0, m.index - 250), m.index + 500)));
  c++;
}
console.log('matches', c);
