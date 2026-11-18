const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    const t = await client.cdp.send('Target.getTargets');
    const page = (t.targetInfos || []).find(x => x.type === 'page');
    const win = await client.cdp.send('Browser.getWindowForTarget', { targetId: page.targetId });
    console.log('BEFORE', JSON.stringify(win));
    await client.cdp.send('Browser.setWindowBounds', { windowId: win.windowId, bounds: { windowState: 'normal' } });
    await client.cdp.send('Browser.setWindowBounds', { windowId: win.windowId, bounds: { left: 60, top: 40, width: 1700, height: 1000 } }).catch(e => console.log('setbounds', String(e)));
    await new Promise(r => setTimeout(r, 1200));
    const after = await client.cdp.send('Browser.getWindowForTarget', { targetId: page.targetId });
    console.log('AFTER', JSON.stringify(after));
    const f1 = await client.evaluate('window.__g2.frame');
    await new Promise(r => setTimeout(r, 1000));
    const f2 = await client.evaluate('window.__g2.frame');
    const st = await client.evaluate('JSON.stringify({vis:document.visibilityState,me:window.__g2.me&&window.__g2.me.id,ents:window.__g2.w44i_2qp.length})');
    console.log('FPS ~', f2 - f1, st);
  } finally { await client.disconnect().catch(() => {}); }
})();
