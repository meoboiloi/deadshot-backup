const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const lines = src.split(/\r?\n/);

const terms = [
  'WebGLRenderer', 'ShaderMaterial', 'Scene(', 'PerspectiveCamera',
  'DRACOLoader', 'GLTFLoader', 'KTX2Loader', 'AudioListener',
  'PointerLockControls', 'requestPointerLock',
  'LoginEnvelope', 'login-worker', 'pkgLoginWorker',
  'matchmaker', 'matchmaking.deadshot.io', 'party.deadshot.io',
  'ws', 'WebSocket', 'msgpack', 'notepack', 'encode', 'decode',
  'fireRate', 'recoil', 'spread', 'damage', 'headshot', 'hitbox',
  'ammo', 'reload', 'weapon', 'gun',
  'score', 'kills', 'deaths', 'assists',
  'localStorage', 'indexedDB', 'cookie',
  'anti', 'cheat', 'detect', 'fingerprint',
  'xsolla', 'crazygames', 'now.gg', 'google', 'gtag', 'ads',
  'kick', 'ban', 'report',
];

const res = {};
for (const t of terms) {
  const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const hits = [];
  let m;
  while ((m = re.exec(src)) && hits.length < 12) {
    const line = src.slice(0, m.index).split('\n').length;
    const text = (lines[line - 1] || '').trim();
    hits.push({ line, text: text.length > 220 ? text.slice(0, 220) + '…' : text });
  }
  if (hits.length) res[t] = hits;
}
console.log(JSON.stringify({ lines: lines.length, terms: res }, null, 1));
