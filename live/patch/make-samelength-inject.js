const fs = require('fs');
const { unpack, pack } = require('./pkg-tool');

(async () => {
  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(orig);
  const at = text.indexOf('var battle_royale_enabled');
  const js = text.slice(at);

  // find comments in the JS
  const found = [];
  let i = 0;
  while ((i = js.indexOf('/*', i)) >= 0 && found.length < 10) {
    const end = js.indexOf('*/', i + 2);
    if (end > 0) found.push({ i, len: end + 2 - i, txt: js.slice(i, Math.min(end + 2, i + 80)) });
    i += 2;
  }
  console.log(JSON.stringify(found, null, 1));

  const good = found.filter(c => c.len >= 40).sort((a, b) => b.len - a.len)[0];
  if (!good) { console.log('no usable comment'); return; }
  const markerRaw = ';console.log("[DS-PATCH] bundle running");';
  const marker = markerRaw + ' '.repeat(Math.max(0, good.len - markerRaw.length));
  if (marker.length > good.len) { console.log('comment too small'); return; }

  // 1) delete the comment, 2) insert marker at game2.update (same total length)
  const absComment = at + good.i;
  let t = text.slice(0, absComment) + text.slice(absComment + good.len);
  const anchor = t.indexOf('game2.update=function');
  t = t.slice(0, anchor) + marker + t.slice(anchor);
  console.log('comment len', good.len, 'marker len', marker.length, 'delta', t.length - text.length);

  const p = await pack(t);
  fs.writeFileSync(__dirname + '/out/samelength-inject.pkg', p);
  console.log('pkg', p.length);
})();
