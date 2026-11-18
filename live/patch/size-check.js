const fs = require('fs');
const zlib = require('zlib');
const { unpack } = require('./pkg-tool');

const ANTI = [
  ['var dax=window[', 'cXu=!1;dav=!1;var dax=window['],
  ['if(cXu)var daC', 'if(!1)var daC'],
  ['(dru||dav)&&alert(', '(!1)&&alert(']
];

(async () => {
  const pkg = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(pkg);
  const target = 1733385;
  let s = text;
  for (const [a, b] of ANTI) s = s.split(a).join(b);
  const variants = {
    original: text,
    antihook: s,
    inject: s.slice(0, s.indexOf('game2.update=function')) + '\nconsole.log("[DS-PATCH] bundle running");\n' + s.slice(s.indexOf('game2.update=function'))
  };
  for (const [k, v] of Object.entries(variants)) {
    const gz = zlib.gzipSync(Buffer.from(v, 'utf8'), { level: 9 });
    console.log(k, 'text', v.length, 'gz', gz.length, 'deltaVsTarget', gz.length - target);
  }
})();
