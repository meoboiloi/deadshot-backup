const fs = require('fs');
const { connect } = require('C:/Users/Administrator/.config/opencode/skills/chrome-cdp/index');

const PORT = Number(process.env.CDP_PORT || 9222);
const URL = process.argv[2] || 'https://deadshot.io/';
const OUT = 'C:/Users/Administrator/Downloads/deadshot/live/w2s-console.log';

const RUNTIME = `;window.__g2=game2;try{window.__mp=msgpack;}catch(e){}
;(function(){
  if(window.__W2S_ON) return; window.__W2S_ON=true;
  var LOG=[]; window.__W2S_LOG=LOG;
  function log(){try{var a=[].slice.call(arguments);var s=a.join(' ');LOG.push(s);if(LOG.length>800)LOG.shift();console.log(s);}catch(e){}}
  function vecKeys(o){if(!o||typeof o!=='object'||Array.isArray(o))return null;var ks=Object.keys(o),ns=[];for(var i=0;i<ks.length;i++){if(typeof o[ks[i]]==='number')ns.push(ks[i]);}return ns.length===2?ns:null;}
  function findVec(o){if(!o||typeof o!=='object')return null;var ks=Object.keys(o);for(var i=0;i<ks.length;i++){var n=vecKeys(o[ks[i]]);if(n)return{obj:o[ks[i]],xk:n[0],yk:n[1],key:ks[i]};}return null;}
  function findRenderer(){for(var k in game2){var v;try{v=game2[k];}catch(e){continue;}if(Array.isArray(v)&&v[0]&&typeof v[0].ratio==='number'&&v[0].c)return v[0];}return null;}
  function findScene(){for(var k in game2){var v;try{v=game2[k];}catch(e){continue;}if(v&&typeof v==='object'&&v.M0O8_2uu)return v;}return null;}
  function renderObj(e){var ks=Object.keys(e);for(var i=0;i<ks.length;i++){var v=e[ks[i]];if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.type==='string'&&typeof v.size==='number')return v;}return null;}
  var cache={r:null,cam:null,scene:null};
  function tick(){
    try{
      var r=cache.r||(cache.r=findRenderer());
      var ents=game2.w44i_2qp||[];
      if(!r){log('[W2S] no renderer, ents='+ents.length);return;}
      var cam=cache.cam; if(!cam||!cam.obj)cam=cache.cam=findVec(r);
      var sc=cache.scene; if(sc===null)sc=cache.scene=findScene();
      var sr=1,sx=0,sy=0,sa=0;
      if(sc&&sc.M0O8_2uu){var t=sc.M0O8_2uu;if(typeof t.ratio==='number')sr=t.ratio;var tv=findVec(t);if(tv){sx=tv.obj[tv.xk]||0;sy=tv.obj[tv.yk]||0;}for(var q in t){if(typeof t[q]==='number'&&q!=='ratio'){sa=t[q];break;}}}
      var W=r.c.width,H=r.c.height,ratio=r.ratio||1;
      log('[W2S] '+(game2.me?('me='+game2.me.id):'me=?')+' ents='+ents.length+' ratio='+ratio.toFixed(4)+' cam='+(cam?('('+cam.obj[cam.xk].toFixed(1)+','+cam.obj[cam.yk].toFixed(1)+')'):'?')+' scenePos=('+sx.toFixed(1)+','+sy.toFixed(1)+') sceneRatio='+sr+' sceneAngle='+sa.toFixed(3)+' canvas='+W+'x'+H+' spect='+game2.spectating);
      if(!cam){log('[W2S] renderer keys: '+Object.keys(r).join(','));return;}
      for(var i=0;i<ents.length;i++){
        var e=ents[i],ro=renderObj(e),p=ro?findVec(ro):null;
        if(!p&&e['new'])p=findVec(e['new']);
        if(!p)continue;
        var dx=(p.obj[p.xk]-sx)/sr,dy=(p.obj[p.yk]-sy)/sr;
        if(sa){var ca=Math.cos(-sa),sb=Math.sin(-sa);var rx=dx*ca-dy*sb,ry=dx*sb+dy*ca;dx=rx;dy=ry;}
        var px=W/2+(dx-cam.obj[cam.xk])/ratio,py=H/2+(dy-cam.obj[cam.yk])/ratio;
        log('[W2S] id='+e.id+' type='+e.type+' w=('+p.obj[p.xk].toFixed(2)+','+p.obj[p.yk].toFixed(2)+') s=('+px.toFixed(1)+','+py.toFixed(1)+')');
      }
      if(!window.__W2S_DRAW){window.__W2S_DRAW=true;setTimeout(function(){try{var es=game2.w44i_2qp||[];for(var i=0;i<es.length;i++){var e=es[i],ro=renderObj(e);if(!ro||ro.__w2sd)continue;ro.__w2sd=true;var ks=Object.keys(ro);for(var j=0;j<ks.length;j++){var f=ro[ks[j]];if(typeof f==='function'&&f.length>=4){(function(id,fn,obj,key){obj[key]=function(c2,ra,tx,ty){try{if(!this.__wl){this.__wl=1;log('[W2S-DRAW] id='+id+' tx='+tx+' ty='+ty+' ratio='+ra);}}catch(e){}return fn.apply(this,arguments);};})(e.id,f,ro,ks[j]);break;}}}}catch(err){log('[W2S-DRAW] err '+err);}},3000);}
    }catch(err){log('[W2S] tick error '+err);}
  }
  setInterval(tick,1500);
  log('[W2S] runtime installed');
})();
;`;

const HOOK = `(() => {
  try {
    const O = WebSocket;
    window.__WS__ = []; window.__RX__ = [];
    const P = new Proxy(O, {
      construct(t, a, n) {
        const ws = Reflect.construct(t, a, n);
        try { window.__WS__.push({ url: String(a[0]), ws });
          ws.addEventListener('message', ev => { try { window.__RX__.push(ev.data); if (window.__RX__.length > 4000) window.__RX__.shift(); } catch (e) {} });
        } catch (e) {}
        return ws;
      }
    });
    Object.defineProperty(window, 'WebSocket', { value: P, configurable: true, writable: true });
  } catch (e) {}
  const RT = ${JSON.stringify(RUNTIME)};
  function patch(src) {
    try {
      src = src.split('var dax=window[').join('cXu=!1;dav=!1;var dax=window[');
      src = src.split('if(cXu)var daC').join('if(!1)var daC');
      src = src.split('(dru||dav)&&alert(').join('(!1)&&alert(');
      const a = 'game2.update=function';
      const i = src.indexOf(a);
      if (i >= 0) src = src.slice(0, i) + RT + src.slice(i);
      window.__PATCHED__ = { len: src.length, injected: i >= 0 };
    } catch (e) { window.__PATCH_ERR__ = String(e); }
    return src;
  }
  try {
    const Orig = Function;
    const P2 = new Proxy(Orig, {
      construct(t, a, n) {
        try { const s = String(a[a.length - 1]); if (s.length > 5e6) a = a.slice(0, -1).concat([patch(s)]); } catch (e) {}
        return Reflect.construct(t, a, n);
      },
      apply(t, th, a) { return Reflect.apply(t, th, a); }
    });
    Object.defineProperty(window, 'Function', { value: P2, configurable: true, writable: true });
  } catch (e) {}
})();`;

(async () => {
  const client = await connect({ port: PORT, autoEnableAll: false });
  const lines = [];
  const write = s => { lines.push(s); try { fs.appendFileSync(OUT, s + '\n'); } catch (e) {} };
  fs.writeFileSync(OUT, '');
  try {
    client.page.on('console', m => write('[PAGE] ' + m.type() + ' ' + m.text()));
    client.page.on('pageerror', e => write('[PAGEERROR] ' + e.message));
    await client.cdp.send('Page.enable');
    await client.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await client.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => write('[GOTO] ' + e.message));
    await new Promise(r => setTimeout(r, 15000));
    const st = await client.evaluate(`JSON.stringify({g2:!!window.__g2,installed:!!window.__W2S_ON,patched:window.__PATCHED__,vis:document.visibilityState,frame:window.__g2?window.__g2.frame:null})`).catch(e => 'ERR ' + e.message);
    write('[STATE] ' + st);
  } finally { await client.disconnect().catch(() => {}); }
  console.log(lines.join('\n'));
})();
