// @expected a b
// @ts-nocheck
(function foo (exports) {
  exports._a = -1;
  module.exports = {a: 1};
  module.exports.b = 2;
})();
