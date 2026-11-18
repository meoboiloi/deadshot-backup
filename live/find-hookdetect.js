const fs = require('fs');
const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/source-readable.js', 'utf8');
const needles = [
  'navigator.', 'webdriver', 'plugins', 'mimeTypes', 'runtime', 'toString',
  '[native code]', 'native code', 'Proxy', 'debugger', 'devtools', 'outerWidth',
  'outerHeight', 'innerWidth', 'window.chrome', 'chrome.', 'isSecureContext',
  'permissions', 'userAgent', 'userAgentData', 'getHighEntropyValues'
];
for (const n of needles) {
  let i = 0, c = 0;
  console.log('\n### ' + n);
  while ((i = s.indexOf(n, i)) >= 0 && c < 4) {
    console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - 180), i + 260)));
    i += n.length; c++;
  }
  if (!c) console.log('none');
}
