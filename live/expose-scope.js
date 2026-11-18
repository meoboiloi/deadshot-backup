const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Runtime.enable');
    const proto = await client.cdp.send('Runtime.evaluate', { expression: 'WebSocket.prototype' });
    const q = await client.cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    const arr = await client.cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function(){return Array.from(this)}', objectGroup: 'ws' });
    const props = await client.cdp.send('Runtime.getProperties', { objectId: arr.result.objectId, ownProperties: true });
    const sockets = (props.result || []).filter(p => /^\d+$/.test(p.name) && p.value && p.value.objectId);
    let target = null;
    for (const s of sockets) {
      const u = await client.cdp.send('Runtime.callFunctionOn', { objectId: s.value.objectId, functionDeclaration: 'function(){return this.url}', returnByValue: true }).catch(() => null);
      const url = u && u.result && u.result.value;
      if (url && url.indexOf('ip_') >= 0) target = s.value.objectId;
    }
    if (!target) { console.log('no match socket'); return; }
    const fn = await client.cdp.send('Runtime.callFunctionOn', { objectId: target, functionDeclaration: 'function(){return this.onmessage}', objectGroup: 'om' });
    const fp = await client.cdp.send('Runtime.getProperties', { objectId: fn.result.objectId, ownProperties: true });
    const scopesRef = (fp.internalProperties || []).find(x => x.name === '[[Scopes]]');
    const scopes = await client.cdp.send('Runtime.getProperties', { objectId: scopesRef.value.objectId, ownProperties: true });
    let bigProps = null, bigN = -1;
    for (const s of scopes.result || []) {
      if (!s.value || !s.value.objectId) continue;
      const sp = await client.cdp.send('Runtime.getProperties', { objectId: s.value.objectId, ownProperties: true }).catch(() => null);
      const n = sp ? (sp.result || []).filter(x => !/^\d+$/.test(x.name)).length : 0;
      if (n > bigN) { bigN = n; bigProps = sp; }
    }
    const wanted = ['cSg', 'd0r', 'd25', 'dtg', 'ui', 'cOz', 'cOE', 'b7g', 'b7h', 'dtn', 'dti', 'dtL'];
    const map = {};
    for (const p of bigProps.result || []) {
      if (wanted.indexOf(p.name) >= 0 && p.value && p.value.objectId) map[p.name] = p.value.objectId;
    }
    console.log('FOUND', JSON.stringify(Object.keys(map)));
    for (const [name, objId] of Object.entries(map)) {
      const r = await client.cdp.send('Runtime.callFunctionOn', {
        objectId: objId,
        functionDeclaration: `function(){ window['__m_'+${JSON.stringify(name)}] = this; return true; }`,
        returnByValue: true
      }).catch(e => null);
      if (!r) console.log('bind fail', name);
    }
    const out = await client.evaluate(`JSON.stringify({
      g2_from_scope: window.__m_cSg === window.__g2,
      d25: window.__m_d25 ? { keys: Object.keys(window.__m_d25).length, arrays: Object.keys(window.__m_d25).filter(k => Array.isArray(window.__m_d25[k])).map(k => k + ':' + window.__m_d25[k].length) } : null,
      d0r: window.__m_d0r ? { keys: Object.keys(window.__m_d0r).length, ratio: window.__m_d0r.ratio } : null,
      dtg: window.__m_dtg ? { len: window.__m_dtg.length, keys: Object.keys(window.__m_dtg) } : null,
      ui: window.__m_ui ? Object.keys(window.__m_ui).length : null
    })`);
    console.log(out);
  } finally { await client.disconnect().catch(() => {}); }
})();
