const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Runtime.enable');
    const canvasInfo = await client.evaluate(`(() => {
      const c = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
      let g2d = null, ggl = null, ggl2 = null;
      try { g2d = c.getContext('2d') ? c.getContext('2d').constructor.name : null; } catch (e) { g2d = 'err'; }
      try { ggl = c.getContext('webgl') ? 'yes' : null; } catch (e) { ggl = 'err'; }
      try { ggl2 = c.getContext('webgl2') ? 'yes' : null; } catch (e) { ggl2 = 'err'; }
      const exp = {};
      for (const k of Object.keys(c)) { const v = c[k]; exp[k] = v === null ? 'null' : typeof v; }
      return JSON.stringify({ w: c.width, h: c.height, ctx2d: g2d, gl: ggl, gl2: ggl2, expando: exp, hasGlProp: !!c.gl, shim: !!c.canvas2DtoWebGL_enabled });
    })()`);
    console.log('CANVAS', canvasInfo);

    const proto = await client.cdp.send('Runtime.evaluate', { expression: 'rwJ2_319.WebGLRenderer.prototype' });
    const q = await client.cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    const hook = await client.cdp.send('Runtime.callFunctionOn', {
      objectId: q.objects.objectId,
      functionDeclaration: `function () {
        this.forEach((r, i) => {
          if (r.__cnt === undefined) {
            r.__cnt = 0;
            const orig = r.render;
            if (typeof orig === 'function') {
              r.render = function () { r.__cnt++; return orig.apply(this, arguments); };
            }
          }
        });
        return this.length;
      }`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 1500));
    const after = await client.cdp.send('Runtime.callFunctionOn', {
      objectId: q.objects.objectId,
      functionDeclaration: 'function(){return Array.from(this).map(r=>({cnt:r.__cnt,hasLast:false}))}',
      returnByValue: true
    });
    const last = await client.evaluate('JSON.stringify({last: !!window.__lastRender, err: window.__renderErr||null})');
    console.log('HOOKED', hook.result.value, 'AFTER', JSON.stringify(after.result.value), last);
  } finally { await client.disconnect().catch(() => {}); }
})();
