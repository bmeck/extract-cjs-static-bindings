// @expected 
const exports = {
  a: 1,
  c: 3
};
exports.a = 1;
{
  let exports = {b: 2};
  exports.b = 2;
}
exports.c = 3;
