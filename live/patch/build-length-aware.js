// Repack raw pkg data while relocating the loader's byte-offset metadata.
// Usage: node build-length-aware.js [--at game2-update] [--inject-file path] [--install]
// Supported insertion points: the opening assignment, or before game2.update.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { packRaw, unpack } = require('./pkg-tool');

const cache = path.join(__dirname, 'cache');
const out = path.join(__dirname, 'out');
const assets = path.join(__dirname, '../../vai-lon-ds/assets');
const originalStatement = Buffer.from('var battle_royale_enabled=false;');
const modifiedStatement = Buffer.from('var battle_royale_enabled=true ;');
const guards = [
  ['if(!Fpw6Vv){throw', 'if(!1){throw'],
  ['if(yBqEh3s===amjxY4[I0Dy3ft(0xd20,lixLAZ[0x3])])', 'if(!1)'],
];
const operationWidths = { B:3, W:7, T:9, S:4, J:7, H:3, N:3, D:6, P:4, O:3, I:9 };

function relocate(metadata, sourceLength, insertAt, delta) {
  const fields = metadata.split('|');
  if (fields.length !== 4 || !/^(?:\d+U,?)+$/.test(fields[0])) throw Error('Unknown pkg header');
  let shifted = 0;
  const position = value => {
    const n = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n > sourceLength) {
      throw Error(`Invalid metadata position: ${value}`);
    }
    if (n >= insertAt) { shifted++; return String(n + delta); }
    return value;
  };
  // Position → substitution ID; the ID is not an offset.
  fields[1] = fields[1].split(',').map(pair => {
    const parts = pair.split(':');
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) throw Error('Invalid substitution');
    return `${position(parts[0])}:${parts[1]}`;
  }).join(',');
  // All numbers in the range field are byte positions.
  if (!/^[\d:~,]+$/.test(fields[2])) throw Error('Invalid range metadata');
  fields[2] = fields[2].split('~').map(group => group.split(',').map(range => {
    const [from, to] = range.split(':');
    if (from === undefined || to === undefined || Number(from) < insertAt && Number(to) > insertAt) {
      throw Error(`Insertion crosses metadata range: ${range}`);
    }
    return `${position(from)}:${position(to)}`;
  }).join(',')).join('~');
  // S/D/P and the exceptional 8-field J have a trailing flag, not a position.
  fields[3] = fields[3].split('~').map(operation => {
    const parts = operation.split(':');
    const flagged = ['S','D','P'].includes(parts[0]) || (parts[0] === 'J' && parts.length === 8);
    const width = parts[0] === 'J' && flagged ? 8 : operationWidths[parts[0]];
    if (!width || parts.length !== width || parts.slice(1).some(x => !/^\d+$/.test(x))) {
      throw Error(`Unknown metadata operation: ${operation}`);
    }
    if (Number(parts[1]) < insertAt && Number(parts[2]) > insertAt) {
      throw Error(`Insertion crosses metadata operation: ${operation}`);
    }
    return [parts[0], ...parts.slice(1).map((value, i) =>
      flagged && i === parts.length - 2 ? value : position(value))].join(':');
  }).join('~');
  return { header: fields.join('|') + ';', shifted };
}

async function main() {
  const options = process.argv.slice(2);
  const fileIndex = options.indexOf('--inject-file');
  if (fileIndex !== -1 && !options[fileIndex+1]) throw Error('Missing --inject-file path');
  const atIndex = options.indexOf('--at');
  const at = atIndex < 0 ? 'start' : options[atIndex+1];
  if (!['start','game2-update','both'].includes(at)) throw Error(`Unknown insertion point: ${at}`);

  const readScript = index => {
    if (index < 0) return null;
    const file = options[index + 1];
    if (!file) throw Error('Missing --inject-file path');
    const text = fs.readFileSync(file, 'utf8');
    new vm.Script(text, { filename: file }); // Parse only; never execute here.
    return text + '\n';
  };
  const legacyScript = readScript(fileIndex) ??
    (at === 'game2-update' ? 'window.__deadshotModLoaded = true;\n' : null);

  const original = (await unpack(fs.readFileSync(path.join(cache, 'final.pkg')))).raw;
  const sourceAt = original.indexOf(originalStatement);
  if (sourceAt < 0 || original.indexOf(originalStatement, sourceAt+1) !== -1 ||
      !original.subarray(0, sourceAt).every(byte => byte <= 127) ||
      original[sourceAt-1] !== 59) throw Error('Unexpected package layout');
  let header = original.subarray(0, sourceAt).toString('latin1').slice(0, -1);
  if (!original.subarray(0, sourceAt).toString('latin1').endsWith(';')) {
    throw Error('Missing metadata terminator');
  }
  const source = Buffer.from(original.subarray(sourceAt));
  modifiedStatement.copy(source, 0);

  const updateAt = 'game2.update=function(){';
  const updateIndex = source.indexOf(updateAt);
  if (at !== 'start' && (updateIndex < 0 || source.indexOf(updateAt, updateIndex + 1) !== -1)) {
    throw Error('Expected one game2.update assignment');
  }
  const updateOffset = updateIndex + updateAt.length;
  if (at !== 'start') {
    const from = Buffer.from('var currentFPS=Math.max(cMW.C716_2w1(),30);');
    if (!source.subarray(updateOffset, updateOffset + from.length).equals(from)) {
      throw Error('game2.update logic changed in the source build');
    }
    source[updateOffset + from.length - 4] = 0x33; // 30 → 31 (minimum FPS clamp).
    source[updateOffset + from.length - 3] = 0x31;
  }

  const insertions = [];
  if (at === 'start') insertions.push({ at: 'start', offset: originalStatement.length, bytes: legacyScript });
  if (at === 'game2-update') insertions.push({ at: 'game2-update', offset: updateOffset, bytes: legacyScript });
  if (at === 'both') {
    const startIndex = options.indexOf('--inject-start');
    const updateIndexOpt = options.indexOf('--inject-update');
    const startScript = readScript(startIndex);
    const updateScript = readScript(updateIndexOpt);
    if (!startScript || !updateScript) throw Error('--at both needs --inject-start and --inject-update');
    insertions.push({ at: 'start', offset: originalStatement.length, bytes: startScript });
    insertions.push({ at: 'game2-update', offset: updateOffset, bytes: updateScript });
  }
  if (insertions.some(item => !item.bytes)) throw Error('Missing injection script');

  // Apply the later insertion first so earlier offsets stay valid.
  insertions.sort((a, b) => b.offset - a.offset);
  let payload = source;
  let relocated = 0;
  const applied = [];
  for (const item of insertions) {
    const injection = Buffer.from(item.bytes);
    const result = relocate(header, payload.length, item.offset, injection.length);
    header = result.header.slice(0, -1);
    relocated += result.shifted;
    payload = Buffer.concat([
      payload.subarray(0, item.offset), injection, payload.subarray(item.offset),
    ]);
    applied.push({ at: item.at, offset: item.offset, bytes: injection.length,
      relocatedPositions: result.shifted });
  }
  const raw = Buffer.concat([Buffer.from(header + ';', 'latin1'), payload]);
  const pkg = await packRaw(zlib.gzipSync(raw, { level: 9 }));
  if (!(await unpack(pkg)).raw.equals(raw)) throw Error('Package roundtrip mismatch');
  // --keep-signature: reuse the original trailing 64-byte signature instead of
  // the zeroed one from packRaw, so the loader derives the same key material the
  // server expects. Local signature verification still fails; the HTML guards
  // already bypass it.
  if (options.includes('--keep-signature')) {
    const pristine = fs.readFileSync(path.join(cache, 'final.pkg'));
    pristine.copy(pkg, pkg.length - 64, pristine.length - 64);
  }
  let html = fs.readFileSync(path.join(cache, 'index.html'), 'utf8');
  for (const [from, to] of guards) {
    if (html.split(from).length !== 2) throw Error(`HTML guard changed: ${from}`);
    html = html.replace(from, to);
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'length-aware-index.html'), html);
  fs.writeFileSync(path.join(out, 'length-aware-final.pkg'), pkg);
  if (options.includes('--install')) {
    fs.writeFileSync(path.join(assets, 'index.html'), html);
    fs.writeFileSync(path.join(assets, 'final.pkg'), pkg);
    fs.writeFileSync(path.join(assets, 'final_legacy.pkg'), pkg);
  }
  console.log(JSON.stringify({ insertions: applied, relocatedPositions: relocated,
    originalSourceBytes: source.length, newSourceBytes: payload.length,
    originalHeaderBytes: sourceAt, newHeaderBytes: Buffer.byteLength(header + ';'),
    pkgBytes:pkg.length, installed:options.includes('--install') }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
