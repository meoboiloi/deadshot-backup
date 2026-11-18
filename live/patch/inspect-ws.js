// WebSocket frame logger for diagnosing server-side "client out of date" (close
// code 4008). Wraps instance send/onmessage without touching
// WebSocket.toString(), which the in-bundle `dav` probe inspects.
(() => {
  if (window.__wsLog) return 'already';
  const log = [];
  const MAX = 400;
  const toText = data => {
    try {
      if (typeof data === 'string') return data.slice(0, 400);
      if (data && data.byteLength !== undefined) {
        const bytes = new Uint8Array(data);
        let out = '';
        for (let i = 0; i < Math.min(bytes.length, 400); i++) out += String.fromCharCode(bytes[i]);
        return out;
      }
    } catch (e) {}
    return '<unreadable>';
  };
  const push = (dir, socket, data) => {
    if (log.length >= MAX) log.shift();
    log.push({ t: Date.now(), dir, url: socket && socket.url, text: toText(data) });
  };
  const origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try { push('out', this, data); } catch (e) {}
    return origSend.apply(this, arguments);
  };
  const desc = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
  if (desc && desc.set) {
    Object.defineProperty(WebSocket.prototype, 'onmessage', {
      configurable: true,
      enumerable: desc.enumerable,
      get() { return desc.get.call(this); },
      set(handler) {
        desc.set.call(this, function (event) {
          try { push('in', this, event.data); } catch (e) {}
          return handler.apply(this, arguments);
        });
      }
    });
  }
  const origAdd = WebSocket.prototype.addEventListener;
  WebSocket.prototype.addEventListener = function (type, listener, options) {
    if (type === 'message' && typeof listener === 'function') {
      const wrapped = function (event) {
        try { push('in', this, event.data); } catch (e) {}
        return listener.apply(this, arguments);
      };
      return origAdd.call(this, type, wrapped, options);
    }
    return origAdd.call(this, type, listener, options);
  };
  // Object.defineProperty on the prototype does not change WebSocket.toString();
  // Prototype method replacement does not either (only the constructor's own
  // toString is checked by the bundle).
  window.__wsLog = log;
  window.__wsLogDump = () => JSON.stringify(log);
  window.__wsLogClear = () => { log.length = 0; };
  return 'installed';
})();
