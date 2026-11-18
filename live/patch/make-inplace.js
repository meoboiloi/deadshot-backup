const fs = require('fs');
const { execFileSync } = require('child_process');
const { unpack, pack } = require('./pkg-tool');

(async () => {
  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const { text } = await unpack(orig);
  const comment = '/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */';
  const idx = text.indexOf(comment);
  const raw = ';window.__INPLACE=1;window.__INPLACE_LEN=game2?1:0;';
  if (raw.length > comment.length) { console.log('too long'); return; }
  const payload = raw + ' '.repeat(comment.length - raw.length);
  const t = text.slice(0, idx) + payload + text.slice(idx + comment.length);
  console.log('idx', idx, 'len', comment.length, 'payload', payload.length, 'delta', t.length - text.length);

  const at = t.indexOf('var battle_royale_enabled');
  fs.writeFileSync(__dirname + '/syntax-inplace.js', t.slice(at), 'utf8');
  try {
    execFileSync(process.execPath, ['--check', __dirname + '/syntax-inplace.js'], { stdio: 'pipe' });
    console.log('SYNTAX OK');
  } catch (e) { console.log('SYNTAX ERR', String(e.stderr || '').slice(0, 400)); return; }

  const p = await pack(t);
  fs.writeFileSync(__dirname + '/out/inplace.pkg', p);
  console.log('pkg', p.length);
})();
