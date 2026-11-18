// Direct-draw ESP renderer: no bridge, no IPC. Creates a full-screen 2D
// overlay canvas above the game and draws entries published on
// globalThis.__ovf.entries ({screenX, screenY, size, visible, team, hp, maxHp,
// name}). Feed it manually with window.__ovfEspDraw([...]) for testing.
(() => {
  if (window.__ovfEsp) return;
  const state = { frames: 0, canvas: null, ctx: null, lastCount: 0 };
  const ensure = () => {
    let canvas = document.getElementById('__ovfEsp');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = '__ovfEsp';
      Object.assign(canvas.style, {
        position: 'fixed', left: '0', top: '0',
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '2147483000'
      });
      (document.body || document.documentElement).appendChild(canvas);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(window.innerWidth * dpr));
    const height = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return state.ctx;
  };
  const draw = entries => {
    const ctx = ensure();
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    let drawn = 0;
    for (const entry of entries || []) {
      if (!entry || entry.screenX === undefined || entry.screenY === undefined) continue;
      const size = Math.max(6, Math.min(400, Number(entry.size) || 18));
      const x = Number(entry.screenX), y = Number(entry.screenY);
      if (!(x > -200 && x < w + 200 && y > -200 && y < h + 200)) continue;
      drawn++;
      const friendly = entry.team !== undefined && entry.team === state.lastTeam;
      const color = friendly ? '#4ade80' : '#ff5555';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - size / 2, y - size, size, size);
      if (entry.hp !== undefined && entry.maxHp) {
        const ratio = Math.max(0, Math.min(1, entry.hp / entry.maxHp));
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - size / 2, y - size - 6, size, 3);
        ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ff5555';
        ctx.fillRect(x - size / 2, y - size - 6, size * ratio, 3);
      }
      const label = entry.name || '';
      if (label) {
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        const tw = ctx.measureText(label).width;
        ctx.fillRect(x - tw / 2 - 3, y - size - 21, tw + 6, 14);
        ctx.fillStyle = color;
        ctx.fillText(label, x, y - size - 10);
      }
    }
    state.lastCount = drawn;
    state.frames++;
    window.__ovfEspFrames = state.frames;
    window.__ovfEspDrawn = drawn;
    return drawn;
  };
  window.__ovfEspDraw = draw;
  window.__ovfEsp = state;
  window.__ovfEspSetTeam = team => { state.lastTeam = team; };
  // Stable publisher API so data hooks can feed the renderer without a bridge.
  const esp = globalThis.__ovf = globalThis.__ovf || { entries: new Map(), localTeam: null };
  if (!esp.entries) esp.entries = new Map();
  window.__ovfUpsert = (id, entry) => {
    if (!entry || entry.dead || (entry.hp !== undefined && entry.hp <= 0)) {
      esp.entries.delete(id);
      return;
    }
    esp.entries.set(id, { ...entry, updatedAt: performance.now() });
  };
  window.__ovfClear = () => esp.entries.clear();

  // Expose the game object from this same script scope so the renderer (and
  // later hooks) can read live frame data without a bridge.
  const attachGame = () => {
    try {
      if (typeof game2 !== 'undefined' && game2 && typeof game2.update === 'function') {
        window.__g2 = game2;
        return true;
      }
    } catch (e) { window.__ovfAttachError = String(e); }
    return false;
  };
  attachGame();
  window.__ovfAttach = attachGame;

  // Best-effort feed: game2.positions/types are populated while a match runs.
  const publishFromGame = () => {
    const g = window.__g2 || (attachGame() ? window.__g2 : null);
    if (!g || !Array.isArray(g.positions) || g.positions.length === 0) return;
    const types = Array.isArray(g.types) ? g.types : [];
    window.__ovfRaw = g.positions.slice(0, 64);
    const seen = new Set();
    for (let i = 0; i < g.positions.length; i++) {
      const item = g.positions[i];
      let sx, sy, size, name, hp, maxHp;
      if (Array.isArray(item)) { sx = Number(item[0]); sy = Number(item[1]); size = Number(item[2]) || 26; }
      else if (item && typeof item === 'object') {
        sx = Number(item.screenX ?? item.x); sy = Number(item.screenY ?? item.y);
        size = Number(item.size ?? item.w) || 26;
        name = item.name; hp = item.hp; maxHp = item.maxHp;
      }
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
      if (sx < 0 || sy < 0 || sx > window.innerWidth || sy > window.innerHeight) continue;
      const id = item && item.id !== undefined ? item.id : i;
      if (seen.has(id)) continue;
      seen.add(id);
      const team = types[i] !== undefined ? Number(types[i]) : undefined;
      window.__ovfUpsert(id, { screenX: sx, screenY: sy, size, team, hp, maxHp, name });
    }
  };
  window.__ovfPublishFromGame = publishFromGame;
  const loop = () => {
    try {
      publishFromGame();
      const entries = globalThis.__ovf && globalThis.__ovf.entries;
      if (entries && typeof entries.forEach === 'function') {
        const list = [];
        entries.forEach(value => { if (value && value.updatedAt && performance.now() - value.updatedAt < 150) list.push(value); });
        if (list.length) draw(list);
      }
    } catch (e) { window.__ovfEspLastError = String(e); }
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
})();
