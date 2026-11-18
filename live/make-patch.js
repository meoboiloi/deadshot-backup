const fs = require('fs');
const srcPath = 'C:/Users/Administrator/Downloads/deadshot/live/source-readable.js';
const outPath = 'C:/Users/Administrator/Downloads/deadshot/live/patched-nodetect.js';
let src = fs.readFileSync(srcPath, 'utf8');

const reps = [
  ['var dax=window[d9B],daz;', 'cXu=!1;dav=!1;var dax=window[d9B],daz;'],
  ['if(cXu)var daC=0x11;', 'if(!1)var daC=0x11;'],
  ['(dru||dav)&&alert(', '(!1)&&alert(']
];
for (const [a, b] of reps) {
  const n = src.split(a).length - 1;
  console.log('replace', JSON.stringify(a.slice(0, 40)), 'count', n);
  if (n < 1) throw new Error('pattern not found: ' + a);
  src = src.split(a).join(b);
}
fs.writeFileSync(outPath, src, 'utf8');
console.log('written', outPath, src.length);
