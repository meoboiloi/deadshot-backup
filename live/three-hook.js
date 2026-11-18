const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Runtime.enable').catch(() => {});
    const proto = await client.cdp.send('Runtime.evaluate', { expression: 'rwJ2_319.WebGLRenderer.prototype' });
    const objs = await client.cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });

    const info = await client.cdp.send('Runtime.callFunctionOn', {
      objectId: objs.objects.objectId,
      functionDeclaration: `function () {
        return {
          n: this.length,
          items: Array.from(this).map((r, i) => ({
            i,
            w: r.domElement && r.domElement.width,
            h: r.domElement && r.domElement.height,
            conn: r.domElement && r.domElement.isConnected,
            hooked: !!r.__hooked,
            drawCalls: r.info && r.info.render && r.info.render.calls,
            tris: r.info && r.info.render && r.info.render.triangles
          }))
        };
      }`,
      returnByValue: true
    });
    console.log('INSTANCES', JSON.stringify(info.result.value));

    const hook = await client.cdp.send('Runtime.callFunctionOn', {
      objectId: objs.objects.objectId,
      functionDeclaration: `function () {
        window.__threeRenderers = Array.from(this);
        let hooked = 0;
        this.forEach(r => {
          if (r.__hooked) return;
          r.__hooked = true;
          const orig = r.render;
          r.render = function (scene, camera) {
            try {
              if (scene && scene.isScene && camera && camera.isCamera) {
                window.__lastRender = { scene, camera, t: performance.now(), drawCalls: r.info && r.info.render && r.info.render.calls };
              }
            } catch (e) { window.__renderErr = String(e); }
            return orig.apply(this, arguments);
          };
          hooked++;
        });
        return hooked;
      }`,
      returnByValue: true
    });
    console.log('HOOKED', JSON.stringify(hook.result.value));
  } finally { await client.disconnect().catch(() => {}); }
})();
