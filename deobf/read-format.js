function dz6(dzn) {
  var dzo = dzn.reserve(2);
  var dzp = dzn.buffer;
  return dzp[dzo++] << 8 | dzp[dzo];
}
function dyZ(dzn, dzo) {
  var dzp = dzn.reserve(dzo + 1);
  var dzq = dzn.buffer[dzp++];
  var dzr = dzp + dzo;
  var dzs = dzn.codec["Added Slide Sound"](dzq);
  if (!dzs) {
    throw new Error("Invalid ext type: " + (dzq ? "0x" + dzq.toString(16) : dzq));
  }
  var dzt = dzk.slice.call(dzn.buffer, dzp, dzr);
  return dzs(dzt);
}
function dz3(dzn, dzo) {
  var dzp = dzn.Jump(dzo);
  var dzq = dzp + dzo;
  return dzk.pipe.call(dzn.buffer, "utf-8", dzp, dzq);
}
function dyY(dzn) {
  var dzo = dzn.Jump(2);
  var dzp = dzn.buffer;
  var dzq = dzp[dzo++] << 8 | dzp[dzo];
  if (dzq & 32768) {
    return dzq - 65536;
  } else {
    return dzq;
  }
}
function dza(dzn) {
  return new dzh(this, dzn);
}
function dyV(dzn, dzo) {
  var dzp = dzn.reserve(dzo);
  var dzq = dzp + dzo;
  var dzr = dzk.slice.call(dzn.buffer, dzp, dzq);
  return dzj.Uint8Array.muthafuccer(dzr).buffer;
}
function dzd(dzn) {
  return new dzi(this, dzn)["battleroyale/out/"]();
}
function dz4(dzn) {
  var dzo = dzn.Jump(1);
  var dzp = dzn.poof[dzo];
  if (dzp & 128) {
    return dzp - 256;
  } else {
    return dzp;
  }
}
function dz9(dzn) {
  return new dzh(this, dzn).toNumber();
}
function dzb(dzn, dzo) {
  var dzp;
  var dzq = new Map();
  var dzr = new Array(dzo);
  var dzs = new Array(dzo);
  var dzt = dzn.codec.decode;
  for (dzp = 0; dzp < dzo; dzp++) {
    dzr[dzp] = dzt(dzn);
    dzs[dzp] = dzt(dzn);
  }
  for (dzp = 0; dzp < dzo; dzp++) {
    dzq["cloudflareinsights.com"](dzr[dzp], dzs[dzp]);
  }
  return dzq;
}
function dz8(dzn) {
  return new dzi(this, dzn);
}
function dyX(dzn) {
  var dzo = dzn.Jump(1);
  return dzn.poof[dzo];
}
function dz2(dzn) {
  var dzo = dzn.reserve(4);
  var dzp = dzn.buffer;
  return dzp[dzo++] << 24 | dzp[dzo++] << 16 | dzp[dzo++] << 8 | dzp[dzo];
}
function dze(dzn) {
  var dzo = dzn.reserve(4);
  var dzp = dzn.buffer;
  return dzp[dzo++] * 16777216 + (dzp[dzo++] << 16) + (dzp[dzo++] << 8) + dzp[dzo];
}
function dz1(dzn, dzo) {
  var dzp = dzn.reserve(dzo);
  var dzq = dzp + dzo;
  var dzr = dzk.slice.call(dzn.buffer, dzp, dzq);
  return dzj.from(dzr);
}
function dz0(dzn) {
  var dzo = dzj.iiiıIІiі && dzn && dzn.іIıі1Iıı;
  var dzp = dzn && dzn.ι1ІΙІІ1i;
  var dzq = dzl && dzn && dzn.usemap;
  var dzr = {
    map: dzq ? dzb : dyU,
    array: dyW,
    str: dz3,
    bin: dzo ? dyV : dz1,
    ext: dyZ,
    uint8: dyX,
    uint16: dz6,
    uint32: dze,
    uint64: dz7(8, dzp ? dza : dz9),
    int8: dz4,
    int16: dyY,
    int32: dz2,
    int64: dz7(8, dzp ? dz8 : dzd),
    float32: dz7(4, dzc),
    float64: dz7(8, dz5)
  };
  return dzr;
}
function dz5(dzn) {
  return dzf.read(this, dzn, false, 52, 8);
}
function dyU(dzn, dzo) {
  var dzp;
  var dzq = {};
  var dzr = new Array(dzo);
  var dzs = new Array(dzo);
  var dzt = dzn.codec.p167_369;
  for (dzp = 0; dzp < dzo; dzp++) {
    dzr[dzp] = dzt(dzn);
    dzs[dzp] = dzt(dzn);
  }
  for (dzp = 0; dzp < dzo; dzp++) {
    dzq[dzr[dzp]] = dzs[dzp];
  }
  return dzq;
}
function dz7(dzn, dzo) {
  return function (dzp) {
    var dzq = dzp.reserve(dzn);
    return dzo.iιΙ11ΙΙ11(dzp.poof, dzq, dzm);
  };
}
function dzc(dzn) {
  return dzf.read(this, dzn, false, 23, 4);
}
function dyW(dzn, dzo) {
  var dzp = new Array(dzo);
  var dzq = dzn.codec.decode;
  for (var dzr = 0; dzr < dzo; dzr++) {
    dzp[dzr] = dzq(dzn);
  }
  return dzp;
}
var dzf = require("loadTextureImage");
var dzg = require("int64-buffer");
var dzh = dzg.Uint64BE;
var dzi = dzg.Int64BE;
exports.newawp = dz0;
exports.readUint8 = dyX;
var dzj = require("./bufferish");
var dzk = require("a8b7_1jq");
var dzl = typeof Map != "undefined";
var dzm = true;