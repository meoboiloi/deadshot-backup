const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const scopeTree = async (client, fnObjId, depth, maxDepth, out) => {
  const p = await client.cdp.send('Runtime.getProperties', { objectId: fnObjId, ownProperties: true }).catch(() => null);
  if (!p) return;
  const scopesProp = (p.internalProperties || []).find(x => x.name === '[[Scopes]]');
  if (!scopesProp || !scopesProp.value || !scopesProp.value.objectId) return;
  const scopes = await client.cdp.send('Runtime.getProperties', { objectId: scopesProp.value.objectId, ownProperties: true }).catch(() => null);
  if (!scopes) return;
  for (const s of scopes.result || []) {
    if (!s.value || !s.value.objectId) continue;
    const sp = await client.cdp.send('Runtime.getProperties', { objectId: s.value.objectId, ownProperties: true }).catch(() => null);
    if (!sp) continue;
    const names = (sp.result || []).map(x => x.name).filter(n => n && !/^\d+$/.test(n));
    out.push({ depth, scope: s.name || s.value.description, desc: s.value.description, names: names.slice(0, 80), count: names.length });
    if (depth < maxDepth) {
      const g2 = (sp.result || []).find(x => x.name === 'game2');
      if (g2 && g2.value && g2.value.objectId) out.push({ GAME2: g2.value.objectId, depth });
    }
  }
};

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Runtime.enable');
    const proto = await client.cdp.send('Runtime.evaluate', { expression: 'WebSocket.prototype' });
    const q = await client.cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    const list = await client.cdp.send('Runtime.callFunctionOn', {
      objectId: q.objects.objectId,
      functionDeclaration: `function(){return Array.from(this).map((w,i)=>({i,url:w.url,rs:w.readyState,om:typeof w.onmessage,has:!!w.onmessage}))}`,
      returnByValue: true
    });
    console.log('SOCKETS', JSON.stringify(list.result.value));
    const target = (list.result.value || []).find(w => w.has && w.url && w.url.indexOf('ip_') >= 0) || (list.result.value || []).find(w => w.has);
    if (!target) { console.log('no socket with onmessage'); return; }
    console.log('TARGET', JSON.stringify(target));
    const wsObj = await client.cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function(i){return this[i]}', arguments: [{ value: target.i }] });
    const onm = await client.cdp.send('Runtime.callFunctionOn', { objectId: wsObj.result.objectId, functionDeclaration: 'function(){return this.onmessage}', objectGroup: 'probe' }).catch(() => null);
    console.log('ONMESSAGE', onm && onm.result ? onm.result.description : 'null');
    if (!onm || !onm.result || !onm.result.objectId) return;
    const out = [];
    await scopeTree(client, onm.result.objectId, 0, 3, out);
    console.log('SCOPES', JSON.stringify(out, null, 1));
  } finally { await client.disconnect().catch(() => {}); }
})();
