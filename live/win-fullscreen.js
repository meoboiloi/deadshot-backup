const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    const t = await client.cdp.send('Target.getTargets');
    const page = (t.targetInfos || []).find(x => x.type === 'page');
    const win = await client.cdp.send('Browser.getWindowForTarget', { targetId: page.targetId });
    await client.cdp.send('Browser.setWindowBounds', { windowId: win.windowId, bounds: { windowState: 'fullscreen' } });
    await new Promise(r => setTimeout(r, 1500));
    const info = await client.evaluate('JSON.stringify({iw:innerWidth,ih:innerHeight,vis:document.visibilityState,fs:!!document.fullscreenElement,frame:window.__g2.frame})');
    console.log('PLACED', info);

    const x = Math.round((await client.evaluate('innerWidth')) / 2);
    const y = Math.round((await client.evaluate('innerHeight')) * 0.41);
    console.log('CLICK', x, y);
    await client.cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
    await client.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 60));
    await client.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 1200));

    const f1 = await client.evaluate('window.__g2.frame');
    await new Promise(r => setTimeout(r, 1000));
    const f2 = await client.evaluate('window.__g2.frame');
    const st = await client.evaluate('JSON.stringify({me:window.__g2.me&&window.__g2.me.id,ents:window.__g2.w44i_2qp.length,vis:document.visibilityState,fs:!!document.fullscreenElement})');
    console.log('FPS', f2 - f1, st);
  } finally { await client.disconnect().catch(() => {}); }
})();
