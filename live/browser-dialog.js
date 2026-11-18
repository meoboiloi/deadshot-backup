async function main() {
  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  console.log('browser ws', ver.webSocketDebuggerUrl);
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
    } else if (msg.method === 'Page.javascriptDialogOpening') {
      console.log('DIALOG OPENED:', JSON.stringify(msg.params), 'session', msg.sessionId);
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const targets = await send('Target.getTargets');
  const page = targets.targetInfos.find(t => t.type === 'page' && /deadshot\.io/.test(t.url)) || targets.targetInfos.find(t => t.type === 'page');
  console.log('target', page && { id: page.targetId, url: page.url });
  if (!page) { ws.close(); return; }
  const att = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const sessionId = att.sessionId;
  console.log('session', sessionId);
  await send('Page.enable', {}, sessionId).catch(e => console.log('Page.enable', e.message));
  try {
    const r = await send('Page.handleJavaScriptDialog', { accept: false }, sessionId);
    console.log('handleJavaScriptDialog ok', JSON.stringify(r));
  } catch (e) {
    console.log('handle error', e.message);
  }
  await new Promise(r => setTimeout(r, 700));
  try {
    const r = await send('Runtime.evaluate', { expression: 'JSON.stringify({ok:1,title:document.title,canvases:document.querySelectorAll("canvas").length})', returnByValue: true }, sessionId);
    console.log('eval', JSON.stringify(r));
  } catch (e) {
    console.log('eval error', e.message);
  }
  ws.close();
}
main().catch(e => { console.error(e); process.exit(1); });
