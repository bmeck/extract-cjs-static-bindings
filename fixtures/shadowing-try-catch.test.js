// @expected a b c
try {
  exports.a = 1;
} catch {
  exports.b = 2;
} finally {
  exports.c = 3;
}
try {

} catch (exports) {
  exports._a = -1;
}