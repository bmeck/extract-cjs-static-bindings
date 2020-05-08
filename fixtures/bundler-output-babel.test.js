// @expected __esModule foo
// @ts-nocheck
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  foo: true
};
exports.foo = void 0;

var _bar = require("./bundler-output-babel-export-star-from.js");

Object.keys(_bar).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _bar[key];
    }
  });
});
var foo = 1;
exports.foo = foo;
