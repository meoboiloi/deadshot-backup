const fs = require('fs');
const { unpack, pack } = require('./pkg-tool');

(async () => {
  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(orig);
  const t = text + '\n;try{window.__APPEND_OK=1;window.__APPEND_TAIL=typeof game2;}catch(e){window.__APPEND_OK=String(e);}';
  const p = await pack(t);
  fs.writeFileSync(__dirname + '/out/append-code.pkg', p);
  console.log('delta', t.length - text.length, 'tail', JSON.stringify(text.slice(-40)));
})();
