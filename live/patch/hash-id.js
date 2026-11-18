const fs = require('fs');
const crypto = require('crypto');
const { subtle } = require('crypto').webcrypto;
const zlib = require('zlib');
const { unpack, KEYS } = require('./pkg-tool');

const h = b => crypto.createHash('sha256').update(b).digest('hex');
const hs = s => h(Buffer.from(s, 'utf8'));

(async () => {
  const target = 'c010bb6b72cba85e07164c5c29ec89d22dd71dd4534b87d8f241fcf89b10c8b5';
  const computed = '48fdf3453dbbcff415188aaaa13fc81a0bd2c9d7dcb542aa8d48bc2246936d61';

  const orig = fs.readFileSync(__dirname + '/cache/final.pkg');
  const origText = (await unpack(orig)).text;
  const key = await subtle.importKey('raw', Buffer.from(KEYS.aes, 'hex'), 'AES-GCM', false, ['decrypt']);
  const origPlain = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: orig.subarray(0, 12), tagLength: 128 }, key, orig.subarray(12, orig.length - 64)));

  const app = fs.readFileSync(__dirname + '/out/append.pkg');
  const appText = (await unpack(app)).text;
  const appPlain = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: app.subarray(0, 12), tagLength: 128 }, key, app.subarray(12, app.length - 64)));

  const cands = {
    'sha256(origText utf8)': hs(origText),
    'sha256(appText utf8)': hs(appText),
    'sha256(origPlain gz)': h(origPlain),
    'sha256(appPlain gz)': h(appPlain),
    'sha256(orig pkg file)': h(orig),
    'sha256(app pkg file)': h(app),
    'sha256(orig gunzip)': h(zlib.gunzipSync(origPlain)),
    'sha256(app gunzip)': h(zlib.gunzipSync(appPlain)),
    'sha256(origText+0)': hs(origText + '\0'),
  };
  for (const [k, v] of Object.entries(cands)) {
    console.log(v === target ? 'MATCH-EXPECTED ' : (v === computed ? 'MATCH-COMPUTED ' : '              '), k, v.slice(0, 16));
  }
  console.log('expected', target);
  console.log('computed', computed);
  console.log('origText chars', origText.length, 'bytes', Buffer.byteLength(origText, 'utf8'));
  console.log('appText chars', appText.length, 'bytes', Buffer.byteLength(appText, 'utf8'));
})();
