"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  a: true
};
exports.a = exports.default = void 0;

var _innerDep = require("./inner-dep.js");

Object.keys(_innerDep).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _innerDep[key];
    }
  });
});
var _default = 'default';
exports.default = _default;
var a = 1;
exports.a = a;