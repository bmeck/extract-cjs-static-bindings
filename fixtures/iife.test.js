// @expected a b c d e f g
// @ts-nocheck
function ignore() {
  exports._a = 1;
};
!function a() {
  exports.a = 1;
}();
;(function b() {
  exports.b = 2;
})();
;(function* c() {
  exports.c = 3;
})();
;(async function d() {
  exports.d = 4;
})();
;(async function* e() {
  exports.e = 5;
})();
;(() => {
  exports.f = 6;
})();
;(async () => {
  exports.g = 7;
})();
