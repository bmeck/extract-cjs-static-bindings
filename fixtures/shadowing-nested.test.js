// @expected a z
// @ts-nocheck
exports.a = 1;
{
  let exports = {b: 2};
  exports.b = 2;
}
{
  let [exports] = [{c: 3}];
  exports.c = 3;
}
{
  let [...exports] = [{d: 4}];
  exports.d = 4;
}
{
  let {_: exports} = {_: {e: 5}};
  exports.e = 5;
}
{
  let {exports} = {exports: {f: 6}};
  exports.f = 6;
}
{
  let {['exports']: exports} = {exports: {g: 7}};
  exports.g = 7;
}
{
  class exports {};
  exports.h = 8;
}
{
  // annex B is confusing
  function exports() {}
  exports.i = 9;
}
label: {
  let exports = {};
  exports.j = 10;
}
exports.z = 26;
