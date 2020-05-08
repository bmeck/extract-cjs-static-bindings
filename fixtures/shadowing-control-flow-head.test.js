// @expected 
// @ts-nocheck
for (let exports;;exports._a = -1) {
  exports._b = -2;
}
for (var exports in {}) {
  exports._c = -3;
}
for (const exports of []) {
  exports._d = -4;
}
;(async function () {
  for await (const exports of []) {
    exports._e = -5;
  }
})();