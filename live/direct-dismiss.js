function withTimeout(p, ms, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timed out after ' + ms + 'ms')), ms))]);
}

async function main() {
  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params, sessionId) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    const msg = { id: mid, method, params: params || {} };
    if (sessionId) msg.sessionId = sessionId;
    ws.send(JSON.stringify(msg));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method && /Dialog/.test(msg.method)) {
      console.log('EVENT', msg.method, JSON.stringify(msg.params), 'session', msg.sessionId);
    }
  });
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const targets = await withTimeout(send('Target.getTargets'), 5000, 'getTargets');
  const page = targets.targetInfos.find(t => t.type === 'page' && /deadshot\.io/.test(t.url)) || targets.targetInfos.find(t => t.type === 'page');
  console.log('target', page && page.url);
  const { sessionId } = await withTimeout(send('Target.attachToTarget', { targetId: page.targetId, flatten: true }), 5000, 'attach');
  console.log('session', sessionId);

  // try direct dialog commands with timeouts; do NOT await Page.enable
  for (const accept of [false, true]) {
    try {
      const r = await withTimeout(send('Page.handleJavaScriptDialog', { accept }, sessionId), 4000, 'handle accept=' + accept);
      console.log('handle', accept, 'ok', JSON.stringify(r));
    } catch (e) {
      console.log('handle', accept, 'failed:', e.message);
    }
    await new Promise(r => setTimeout(r, 700));
    try {
      const r = await withTimeout(send('Runtime.evaluate', { expression: 'JSON.stringify({ok:1,title:document.title,canvases:document.querySelectorAll("canvas").length})', returnByValue: true }, sessionId), 4000, 'eval');
      console.log('eval', JSON.stringify(r));
      break;
    } catch (e) {
      console.log('eval failed:', e.message);
    }
  }
  ws.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
