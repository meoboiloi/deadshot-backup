// This file is inserted verbatim into the game bundle right before
// `game2.update=function`, i.e. after game2 (renderer, entity array, packet
// handlers) has been initialized and inside the same closure scope.
//
// Available identifiers at this point: game2, and usually msgpack.
// Keep it syntactically self-contained: an IIFE or a single statement.
//
// Example below only logs. Replace it with your own code, then rebuild
// (node build.js) and reload the game through the proxy.

(function () {
  try {
    window.__g2 = game2;
    console.log('[DS-PATCH] hook installed');
    var last = 0;
    setInterval(function () {
      try {
        var ents = game2.w44i_2qp || [];
        if (!ents.length) return;
        var now = Date.now();
        if (now - last < 2000) return;
        last = now;
        console.log('[DS-PATCH] entities', ents.length, 'me', game2.me && game2.me.id);
      } catch (e) {}
    }, 1000);
  } catch (e) {
    console.log('[DS-PATCH] inject error', String(e));
  }
})();
