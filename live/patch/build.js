// Historical experimental builder; its verify stub and length-changing edits
// are NOT validated. Use build-length-aware.js for length-changing edits.
// Builds the two responses the proxy serves:
//   out/index.html   original page + a stub that makes crypto.subtle.verify()
//                    always resolve true (so a repacked .pkg passes)
//   out/final.pkg    gzip(patched source) encrypted with the game's AES-GCM key
//                    + 64 dummy signature bytes
//
// Usage:
//   node build.js                 fetch index.html + final.pkg from deadshot.io
//   node build.js --offline       use ./cache/{index.html,final.pkg}
//   node build.js --no-inject     do not append inject.js
//   node build.js --no-antihook   do not strip the Function-proxy checks
//
// inject.js is inserted verbatim right before `game2.update=function` inside the
// bundle, so it can reference `game2` and (usually) `msgpack`.
const fs = require('fs');
const crypto = require('crypto');
const { unpack, pack } = require('./pkg-tool');

const DIR = __dirname;
const OUT = DIR + '/out';
const CACHE = DIR + '/cache';
const BASE = 'https://deadshot.io/';
const PKG_URL = 'https://deadshot.io/final.pkg';

const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const NO_INJECT = args.includes('--no-inject');
const NO_ANTIHOOK = args.includes('--no-antihook');

const VERIFY_STUB =
  '\n/* DS-PATCH: signature check bypass */\n(function(){try{var P=SubtleCrypto.prototype;var f=function verify(algorithm,key,signature,data){window.__VBC=(window.__VBC||0)+1;return Promise.resolve(true);};Object.defineProperty(P,"verify",{configurable:true,enumerable:true,get:function(){return f;},set:function(){}});}catch(e){console.log("[DS-PATCH] verify stub error",String(e));}console.log("[DS-PATCH] verify bypass installed");})();\n';

const ANTI_HOOK = [
  ['var dax=window[', 'cXu=!1;dav=!1;var dax=window['],
  ['if(cXu)var daC', 'if(!1)var daC'],
  ['(dru||dav)&&alert(', '(!1)&&alert(']
];

async function get(url, file) {
  if (OFFLINE) return fs.readFileSync(file);
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });

  const html = (await get(BASE, CACHE + '/index.html')).toString('utf8');
  const pkg = await get(PKG_URL, CACHE + '/final.pkg');
  const { text } = await unpack(pkg);

  let src = text;
  const applied = {};

  if (!NO_ANTIHOOK) {
    for (const [from, to] of ANTI_HOOK) {
      const n = src.split(from).length - 1;
      applied[from] = n;
      if (n > 0) src = src.split(from).join(to);
    }
  }

  const marker = 'console.log("[DS-PATCH] bundle running", typeof game2!=="undefined"?"game2=ok":"no-game2");';
  const anchor = 'game2.update=function';
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error('anchor not found: ' + anchor);
  let inject = marker;
  if (!NO_INJECT && fs.existsSync(DIR + '/inject.js')) {
    inject = fs.readFileSync(DIR + '/inject.js', 'utf8');
  }
  src = src.slice(0, at) + '\n/* DS-PATCH: inject start */\n' + inject + '\n/* DS-PATCH: inject end */\n' + src.slice(at);

  const newPkg = await pack(src);

  let newHtml = html;
  const integrityFrom = 'if(!Fpw6Vv){throw';
  const integrityCount = newHtml.split(integrityFrom).length - 1;
  if (integrityCount > 0) newHtml = newHtml.split(integrityFrom).join('if(!1){throw');

  // Inject into the first existing inline <script> instead of adding a new
  // <script> element: the loader is sensitive to script order/count.
  const m = /<script\b[^>]*>/i.exec(newHtml);
  if (!m) throw new Error('no <script> found');
  const atHtml = m.index + m[0].length;
  newHtml = newHtml.slice(0, atHtml) + VERIFY_STUB + newHtml.slice(atHtml);

  fs.writeFileSync(OUT + '/index.html', newHtml, 'utf8');
  fs.writeFileSync(OUT + '/final.pkg', newPkg);
  fs.writeFileSync(OUT + '/final_legacy.pkg', newPkg);

  // verify the pack -> unpack cycle
  const check = await unpack(newPkg);
  const report = {
    fetched: { htmlBytes: Buffer.byteLength(html), pkgBytes: pkg.length },
    source: { originalChars: text.length, patchedChars: src.length, delta: src.length - text.length },
    antiHook: applied,
    inject: NO_INJECT ? 'marker' : (fs.existsSync(DIR + '/inject.js') ? 'inject.js' : 'marker'),
    verifyStubInserted: newHtml.indexOf('DS-PATCH: signature check bypass') >= 0,
    integrityPatched: integrityCount,
    repack: {
      pkgBytes: newPkg.length,
      unpackEqual: check.text === src,
      sha256: crypto.createHash('sha256').update(newPkg).digest('hex'),
      htmlSha256: crypto.createHash('sha256').update(newHtml).digest('hex')
    },
    out: OUT
  };
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.repack.unpackEqual) process.exitCode = 1;
}

main().catch(e => { console.error('ERR', e && e.message || e); process.exitCode = 1; });
