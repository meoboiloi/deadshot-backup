const fs = require('fs');
const { execFileSync } = require('child_process');
const { unpack, pack } = require('./pkg-tool');

(async () => {
  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(orig);
  const comment = '/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */';
  const idx = text.indexOf(comment);
  console.log('comment @', idx, 'len', comment.length);
  if (idx < 0) return;

  const raw = ';console.log("[DS-PATCH] bundle running");';
  const marker = raw + ' '.repeat(Math.max(0, comment.length - raw.length));
  let t = text.slice(0, idx) + text.slice(idx + comment.length);
  const anchor = t.indexOf('game2.update=function');
  t = t.slice(0, anchor) + marker + t.slice(anchor);
  console.log('delta', t.length - text.length, 'markerLen', marker.length, 'anchor', anchor);

  const at = t.indexOf('var battle_royale_enabled');
  fs.writeFileSync(__dirname + '/syntax-samelength-inject.js', t.slice(at), 'utf8');
  try {
    execFileSync(process.execPath, ['--check', __dirname + '/syntax-samelength-inject.js'], { stdio: 'pipe' });
    console.log('SYNTAX OK');
  } catch (e) {
    console.log('SYNTAX ERROR', String(e.stderr || '').slice(0, 500));
    return;
  }
  const p = await pack(t);
  fs.writeFileSync(__dirname + '/out/samelength-inject2.pkg', p);
  console.log('pkg', p.length);
})();
