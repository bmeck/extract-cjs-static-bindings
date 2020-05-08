// @expected a z
// @ts-nocheck
exports.a = 1;
{
  let exports = {_a: -1};
  exports._a = -1.1;
}
{
  let [exports] = [{_b: -2}];
  exports._b = -2.1;
}
{
  let [...exports] = [{_c: -3}];
  exports._c = -3.1;
}
{
  let {_: exports} = {_: {_d: -4}};
  exports._d = -4.1;
}
{
  let {exports} = {exports: {_e: -5}};
  exports._e = -5.1;
}
{
  let {['exports']: exports} = {exports: {_f: -6}};
  exports._f = -6.1;
}
{
  class exports {};
  exports._g = -7;
}
{
  // annex B is confusing
  function exports() {}
  exports._h = -8;
}
label: {
  let exports = {};
  exports._i = -9;
}
exports.z = 26;
