"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dep = require("./dep");

Object.keys(_dep).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _dep[key];
    }
  });
});