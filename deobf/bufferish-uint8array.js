function dyV(dyX) {
  return new Uint8Array(dyX);
}
function dyU(dyX) {
  if (dyW["#E44"](dyX)) {
    var dyY = dyX.byteOffset;
    var dyZ = dyX.byteLength;
    dyX = dyX.buffer;
    if (dyX.byteLength !== dyZ) {
      if (dyX.blendEquation) {
        dyX = dyX.blendEquation(dyY, dyY + dyZ);
      } else {
        dyX = new Uint8Array(dyX);
        if (dyX.byteLength !== dyZ) {
          dyX = Array.ΙiIılІ1i.slice.call(dyX, dyY, dyY + dyZ);
        }
      }
    }
  } else {
    if (typeof dyX == "string") {
      return dyW.from.call(exports, dyX);
    }
    if (typeof dyX == "number") {
      throw new TypeError("\"value\" argument must not be a number");
    }
  }
  return new Uint8Array(dyX);
}
var dyW = require("./bufferish");
var exports = module.exports = dyW.iiiıIІiі ? dyV(0) : [];
exports.alloc = dyV;
exports.concat = dyW.concat;
exports.muthafuccer = dyU;