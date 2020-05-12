// @expected 
// @ts-nocheck
_not_module.exports = { _a : -1 };
module._not_exports = { _b : -2 };
_not_exports._c = -3;
Object.defineProperty(_not_module.exports, _d, {
  value: -4
});
Object.defineProperty(module._not_exports, _e, {
  value: -5
});
Object.defineProperty(_not_exports, _f, {
  value: -6
});
