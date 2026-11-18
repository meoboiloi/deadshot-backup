async function main() {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const page = list.find(t => t.type === 'page' && /deadshot\.io/.test(t.url)) || list.find(t => t.type === 'page');
  console.log('page', page && { url: page.url, ws: page.webSocketDebuggerUrl });
  if (!page) return;
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method === 'Page.javascriptDialogOpening') {
      console.log('DIALOG OPENED:', JSON.stringify(msg.params));
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  await send('Page.enable');
  try {
    const r = await send('Page.handleJavaScriptDialog', { accept: false });
    console.log('handleJavaScriptDialog ok', JSON.stringify(r));
  } catch (e) {
    console.log('handle error', e.message);
  }
  await new Promise(r => setTimeout(r, 800));
  try {
    const r = await send('Runtime.evaluate', { expression: 'JSON.stringify({ok:1,title:document.title,canvases:document.querySelectorAll("canvas").length})', returnByValue: true });
    console.log('eval', JSON.stringify(r));
  } catch (e) {
    console.log('eval error', e.message);
  }
  ws.close();
}
main().catch(e => { console.error(e); process.exit(1); });
