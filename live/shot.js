const fs = require('fs');
function withTimeout(p, ms, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timeout')), ms))]);
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
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  const targets = await withTimeout(send('Target.getTargets'), 5000, 'targets');
  const page = targets.targetInfos.find(t => t.type === 'page' && /deadshot/.test(t.url)) || targets.targetInfos.find(t => t.type === 'page');
  const { sessionId } = await withTimeout(send('Target.attachToTarget', { targetId: page.targetId, flatten: true }), 5000, 'attach');
  try {
    const r = await withTimeout(send('Page.captureScreenshot', { format: 'png' }, sessionId), 8000, 'screenshot');
    fs.writeFileSync('C:/Users/Administrator/Downloads/deadshot/live/alert-shot.png', Buffer.from(r.data, 'base64'));
    console.log('screenshot saved', Buffer.from(r.data, 'base64').length);
  } catch (e) {
    console.log('screenshot failed:', e.message);
  }
  ws.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
