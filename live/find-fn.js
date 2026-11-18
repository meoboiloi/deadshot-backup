const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');
for (const name of ['function E3uxI4', 'function _dh_Jg7', 'E3uxI4=', '_dh_Jg7=']) {
  const i = s.indexOf(name);
  console.log('\n===== ' + name + ' @ ' + i + ' =====');
  if (i >= 0) console.log(s.slice(i, i + 2500));
}
