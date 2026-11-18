// Per-frame probe inside game2.update: proves the edited function runs, exposes
// the game object from its own scope, and feeds the ESP renderer.
window.__deadshotUpdateRuns = (window.__deadshotUpdateRuns || 0) + 1;
window.__deadshotUpdateLast = Date.now();
window.__g2 = game2;
if (typeof window.__ovfPublishFromGame === 'function') {
  try { window.__ovfPublishFromGame(); } catch (e) { window.__ovfPublishError = String(e); }
}
