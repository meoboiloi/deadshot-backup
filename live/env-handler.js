const fs = require('fs');
for (const f of ['source-readable.js', 'captured.js']) {
  const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/' + f, 'utf8');
  console.log('\n=== ' + f + ' ===');
  let i = s.indexOf("'e':function");
  if (i < 0) i = s.indexOf('"e":function');
  console.log('env handler', i);
  if (i >= 0) console.log(JSON.stringify(s.slice(i, i + 900)));
}
