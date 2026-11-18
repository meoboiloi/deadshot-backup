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
    const scopeIds = (scopes.result || []).filter(s => s.value && s.value.objectId).map(s => ({ name: s.name, id: s.value.objectId, desc: s.value.description }));

    // big bundle scope is the one with the most vars
    let big = null, bigProps = null;
    for (const s of scopeIds) {
      const sp = await client.cdp.send('Runtime.getProperties', { objectId: s.id, ownProperties: true }).catch(() => null);
      const n = sp ? (sp.result || []).filter(x => !/^\d+$/.test(x.name)).length : 0;
      if (!big || n > big.n) { big = { ...s, n }; bigProps = sp; }
    }
    console.log('BIG SCOPE', big.desc, 'vars', big.n);
    const map = {};
    for (const p of bigProps.result || []) {
      if (/^\d+$/.test(p.name)) continue;
      map[p.name] = p.value && p.value.objectId ? p.value : { value: p.value && p.value.value, type: p.value && p.value.type };
    }
    const names = Object.keys(map);
    const interesting = names.filter(n => /^(game2|cSg|d0r|d25|dtg|dtn|ui|aXW|b7g|b7h|cOz|cOE)$/.test(n));
    console.log('INTERESTING', JSON.stringify(interesting));
    const report = {};
    for (const n of interesting) {
      const v = map[n];
      if (!v || !v.objectId) { report[n] = { type: v && v.type, value: v && v.value }; continue; }
      const d = await client.cdp.send('Runtime.callFunctionOn', {
        objectId: v.objectId,
        functionDeclaration: `function(){try{return {t:typeof this,c:this&&this.constructor&&this.constructor.name,keys:this&&typeof this==='object'?Object.keys(this).length:null,sample:this&&typeof this==='object'?Object.keys(this).slice(0,12):null}}catch(e){return {err:String(e)}}}`,
        returnByValue: true
      }).catch(() => null);
      report[n] = d && d.result && d.result.value;
    }
    console.log('REPORT', JSON.stringify(report, null, 1));
  } finally { await client.disconnect().catch(() => {}); }
})();
