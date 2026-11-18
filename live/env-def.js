const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/captured.js', 'utf8');
const name = 'ΙІiіІii1ιІ';
let i = 0;
while ((i = s.indexOf('game2.' + name, i)) >= 0) {
  console.log('@' + i + ': ' + JSON.stringify(s.slice(i, i + 600)));
  i += name.length;
}
