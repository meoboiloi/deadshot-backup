const fs = require('fs');
const { unpack, pack } = require('./pkg-tool');

const ANTI = [
  ['var dax=window[', 'cXu=!1;dav=!1;var dax=window['],
  ['if(cXu)var daC', 'if(!1)var daC'],
  ['(dru||dav)&&alert(', '(!1)&&alert(']
];
const INJECT = fs.existsSync(__dirname + '/inject.js') ? fs.readFileSync(__dirname + '/inject.js', 'utf8') : 'console.log("[x]");';

(async () => {
  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(orig);
  let anti = text;
  for (const [a, b] of ANTI) anti = anti.split(a).join(b);

  const variants = {
    antihook: anti,
    inject: text.slice(0, text.indexOf('game2.update=function')) + '\n' + INJECT + '\n' + text.slice(text.indexOf('game2.update=function')),
    both: anti.slice(0, anti.indexOf('game2.update=function')) + '\n' + INJECT + '\n' + anti.slice(anti.indexOf('game2.update=function')),
    marker: text.slice(0, text.indexOf('game2.update=function')) + '\nconsole.log("[DS-PATCH] bundle running");\n' + text.slice(text.indexOf('game2.update=function'))
  };
  for (const [k, v] of Object.entries(variants)) {
    const p = await pack(v);
    fs.writeFileSync(__dirname + '/out/' + k + '.pkg', p);
    console.log(k, 'text', v.length, 'pkg', p.length);
  }
})();
