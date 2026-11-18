const fs = require('fs');

function parseArray(s) {
  const nStart = s.indexOf('function n(){');
  if (nStart < 0) return null;
  const arrStart = s.indexOf('[', nStart);
  let i = arrStart, depth = 0, inStr = null;
  for (; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  try { return Function('return (' + s.slice(arrStart, i) + ')')(); } catch (e) { console.log('parse fail', e.message); return null; }
}

for (const f of ['C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'C:/Users/Administrator/Downloads/deadshot/live/captured.js']) {
  const s = fs.readFileSync(f, 'utf8');
  console.log('\n===== ' + f + ' =====');
  const arr = parseArray(s);
  console.log('array', arr && arr.length);
  if (!arr) continue;
  let idx = arr.findIndex(x => typeof x === 'string' && /Please(\\x20| )disable(\\x20| )your(\\x20| )browser/.test(x));
  console.log('msg index', idx, idx >= 0 ? JSON.stringify(arr[idx]) : '');
  const off = idx + 0xaf;
  const hex = '0x' + off.toString(16);
  console.log('target literal', hex);
  const re = new RegExp('([A-Za-z_$][\\w$]*)\\(\\s*' + hex + '\\b', 'g');
  let m, c = 0;
  while ((m = re.exec(s)) && c < 10) {
    console.log('call ' + m[1] + ' @' + m.index + ': ' + JSON.stringify(s.slice(m.index - 260, m.index + 380)));
    c++;
  }
  if (!c) console.log('no call found');
}
