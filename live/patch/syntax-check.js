const fs = require('fs');
const { execFileSync } = require('child_process');
const { unpack } = require('./pkg-tool');

function sourceOf(text) {
  const at = text.indexOf('var battle_royale_enabled');
  return { at, src: text.slice(at) };
}

(async () => {
  for (const [name, path] of [['orig', 'cache/final.pkg'], ['patched', 'out/final.pkg']]) {
    const { text } = await unpack(fs.readFileSync(__dirname + '/' + path));
    const { at, src } = sourceOf(text);
    const file = __dirname + '/syntax-' + name + '.js';
    fs.writeFileSync(file, src, 'utf8');
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      console.log(name, 'sourceOffset', at, 'len', src.length, 'SYNTAX OK');
    } catch (e) {
      console.log(name, 'SYNTAX ERROR');
      console.log(String(e.stderr || e.stdout || e.message).slice(0, 800));
    }
  }
})();

