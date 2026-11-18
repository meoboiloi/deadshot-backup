const fs = require('fs');
const path = process.argv[2];
const src = fs.readFileSync(path, 'utf8');
const lines = src.split(/\r?\n/);

const counts = (re) => (src.match(re) || []).length;

// 1) URLs
const urls = new Map();
for (const m of src.matchAll(/https?:\/\/[^\s"'`)\]}<>]+/g)) {
  const u = m[0].replace(/[,;]+$/, '');
  urls.set(u, (urls.get(u) || 0) + 1);
}
const ws = new Map();
for (const m of src.matchAll(/wss?:\/\/[^\s"'`)\]}<>]+/g)) {
  const u = m[0].replace(/[,;]+$/, '');
  ws.set(u, (ws.get(u) || 0) + 1);
}

// 2) interesting identifiers/keywords with first line numbers
const keywords = [
  'WebSocket', 'matchmaker', 'pkgLoginWorker', 'login-worker', 'socket.io', 'msgpack',
  'three', 'THREE', 'shader', 'gl_FragColor', 'socket', 'emit(', 'onmessage',
  'localStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'atob', 'eval(',
  'Worker(', 'importScripts', 'wasm', 'WebAssembly', 'createImageBitmap',
  'autoshoot', 'Auto Shoot', 'aimbot', 'Aim', 'trigger', 'Trigger', 'recoil', 'spread',
  'GameSocket', 'matchmaking', 'party', 'stat', 'score', 'kill', 'damage', 'hitbox',
  'requestAnimationFrame', 'PointerLock', 'canvas', 'WebGL',
];
const kw = {};
for (const k of keywords) {
  const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  let n = 0, first = -1;
  let mm;
  while ((mm = re.exec(src))) { n++; if (first < 0) first = src.slice(0, mm.index).split('\n').length; if (n > 5000) break; }
  if (n) kw[k] = { n, firstLine: first };
}

// 3) top-level section markers: `// ----` none; find module-ish comments
const markers = [];
lines.forEach((l, i) => {
  if (/^\/\/\s*(#|module|----|====|region|BEGIN|END)/i.test(l) || /^\s*\/\*\s*[A-Za-z].*\*\/\s*$/.test(l)) {
    if (l.length < 160) markers.push([i + 1, l.trim()]);
  }
});

console.log(JSON.stringify({
  file: path,
  bytes: src.length,
  lines: lines.length,
  stats: {
    WebSocket: counts(/\bWebSocket\b/g),
    fetchCalls: counts(/\bfetch\s*\(/g),
    evalCalls: counts(/\beval\s*\(/g),
    atob: counts(/\batob\s*\(/g),
    workers: counts(/\bnew\s+Worker\s*\(/g),
    raf: counts(/requestAnimationFrame/g),
  },
  urls: [...urls.entries()].slice(0, 60),
  ws: [...ws.entries()].slice(0, 30),
  keywords: kw,
  markers: markers.slice(0, 80),
}, null, 2));
