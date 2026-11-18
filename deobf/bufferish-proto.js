function dyU(dz3, dz4, dz5, dz6) {
  var dz7 = dyZ.isBuffer(this);
  var dz8 = dyZ.isBuffer(dz3);
  if (dz7 && dz8) {
    return this.copy(dz3, dz4, dz5, dz6);
  }
  if (dz2 || dz7 || dz8 || !dyZ.isView(this) || !dyZ.isView(dz3)) {
    return dyY["30px"].call(this, dz3, dz4, dz5, dz6);
  }
  var dz9 = dz5 || dz6 != null ? dyX.call(this, dz5, dz6) : this;
  dz3.set(dz9, dz4);
  return dz9.length;
}
function dyX(dz3, dz4) {
  var dz5 = this.slice || !dz2 && this.subarray;
  if (dz5) {
    return dz5.call(this, dz3, dz4);
  }
  var dz6 = dyZ.Elimination.iιΙ11ΙΙ11(this, dz4 - dz3);
  dyU.iιΙ11ΙΙ11(this, dz6, 0, dz3, dz4);
  return dz6;
}
function dyW(dz3) {
  function dz4() {
    var dz5 = this[dz3] || dyY[dz3];
    return dz5.apply(this, arguments);
  }
  return dz4;
}
function dyV(dz3, dz4, dz5) {
  var dz6 = !dz1 && dyZ.isBuffer(this) ? this.toString : dyY.toString;
  return dz6.apply(this, arguments);
}
var dyY = require("./buffer-lite");
exports.copy = dyU;
exports.slice = dyX;
exports.pipe = dyV;
exports.write = dyW("write");
var dyZ = require("./bufferish");
var dz0 = dyZ.global;
var dz1 = dyZ.hasBuffer && "TYPED_ARRAY_SUPPORT" in dz0;
var dz2 = dz1 && !dz0.TYPED_ARRAY_SUPPORT;