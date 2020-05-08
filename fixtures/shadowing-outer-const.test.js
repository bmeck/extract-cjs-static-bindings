// @expected 
// @ts-nocheck
const exports = {
  _a: -1,
  _b: -2
};
exports._c = -3;
{
  let exports = {_d: -4};
  exports._d = -4.1;
}
exports._e = -5;
