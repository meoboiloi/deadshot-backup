const fs = require('fs');
const f = 'C:/Users/Administrator/Downloads/deadshot/live/source-readable.js';
const s = fs.readFileSync(f, 'utf8');
const needles = [
  '__gpp_stub', 'setDgResult', 'chrome.runtime', 'window.chrome', 'navigator.plugins',
  'getEntriesByType', 'performance.getEntries', 'injectScript', 'blockPopupsFunc', 'cW0',
  'LANG_ROWS', 'translate(', 'extension', 'chrome-extension', 'moz-extension',
  'document.documentElement', 'querySelectorAll'
];
for (const n of needles) {
  let i = 0, c = 0;
  console.log('\n### ' + n);
  while ((i = s.indexOf(n, i)) >= 0 && c < 6) {
    console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - 220), i + 320)));
    i += n.length; c++;
  }
  if (!c) console.log('none');
}
