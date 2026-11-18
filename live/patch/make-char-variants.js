const fs = require('fs');
const { unpack, pack } = require('./pkg-tool');

(async () => {
  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(orig);
  const variants = {
    interior1: text.replace('/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */', '/* from Mitsuhiko/webgl-meincraft based on the code on geeks3d.com */'),
    interior2: text.replace('var battle_royale_enabled=false;', 'var battle_royale_enabled=false;/*x*/'.slice(0, 0) + 'var battle_royale_enabled=false;'),
    endchar: text.slice(0, text.length - 1) + ' ',
  };
  for (const [k, v] of Object.entries(variants)) {
    console.log(k, 'delta', v.length - text.length, 'same?', v === text);
    const p = await pack(v);
    fs.writeFileSync(__dirname + '/out/' + k + '.pkg', p);
  }
})();
