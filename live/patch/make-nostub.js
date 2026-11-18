const fs = require('fs');
const html = fs.readFileSync(__dirname + '/cache/index.html', 'utf8');
const out = html.split('if(!Fpw6Vv){throw').join('if(!1){throw');
fs.mkdirSync(__dirname + '/out-nostub', { recursive: true });
fs.writeFileSync(__dirname + '/out-nostub/index.html', out, 'utf8');
console.log('integrity replaced', html.split('if(!Fpw6Vv){throw').length - 1, 'len', out.length);
