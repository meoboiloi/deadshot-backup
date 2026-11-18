const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const HOOK = `(() => {
  try {
    const O = WebSocket;
    window.__WS__ = []; window.__RX__ = []; window.__TX__ = [];
    const P = new Proxy(O, {
      construct(t, a, n) {
        const ws = Reflect.construct(t, a, n);
        try {
          window.__WS__.push({ url: String(a[0]) });
          ws.addEventListener('message', ev => {
            try { window.__RX__.push({ t: Date.now(), data: ev.data }); if (window.__RX__.length > 4000) window.__RX__.shift(); } catch (e) {}
          });
          const send = ws.send.bind(ws);
          ws.send = function (d) {
            try { window.__TX__.push({ t: Date.now(), data: d }); if (window.__TX__.length > 4000) window.__TX__.shift(); } catch (e) {}
            return send(d);
          };
        } catch (e) {}
        return ws;
      }
    });
    Object.defineProperty(window, 'WebSocket', { value: P, configurable: true, writable: true });
  } catch (e) { window.__WSERR__ = String(e); }

  function patch(src) {
    try {
      src = src.split('var dax=window[').join('cXu=!1;dav=!1;var dax=window[');
      src = src.split('if(cXu)var daC').join('if(!1)var daC');
      src = src.split('(dru||dav)&&alert(').join('(!1)&&alert(');
      const anchor = 'game2.update=function';
      const i = src.indexOf(anchor);
      if (i >= 0) src = src.slice(0, i) + 'window.__g2=game2;try{window.__mp=msgpack;}catch(e){};' + src.slice(i);
      window.__PATCHED__ = { len: src.length, exposed: i >= 0 };
    } catch (e) { window.__PATCH_ERR__ = String(e); }
    return src;
  }
  try {
    const Orig = Function;
    const P2 = new Proxy(Orig, {
      construct(t, a, n) {
        try {
          const src = String(a[a.length - 1]);
          if (src.length > 5e6) a = a.slice(0, -1).concat([patch(src)]);
        } catch (e) {}
        return Reflect.construct(t, a, n);
      },
      apply(t, th, a) { return Reflect.apply(t, th, a); }
    });
    Object.defineProperty(window, 'Function', { value: P2, configurable: true, writable: true });
  } catch (e) { window.__FNERR__ = String(e); }
})();`;

(async () => {
  const client = await connect({ port: 9222, autoEnableAll: false });
  try {
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    const url = process.argv[2] || 'https://deadshot.io/';
    await client.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 12000));
    const r = await client.evaluate(`JSON.stringify({
      g2: !!window.__g2, mp: !!window.__mp,
      patched: window.__PATCHED__, errs: { ws: window.__WSERR__, fn: window.__FNERR__, patch: window.__PATCH_ERR__ },
      canvases: document.querySelectorAll('canvas').length,
      ws: window.__WS__, rx: window.__RX__ ? window.__RX__.length : -1
    })`).catch(e => 'ERR ' + e.message);
    console.log(r);
  } finally { await client.disconnect().catch(() => {}); }
})();
