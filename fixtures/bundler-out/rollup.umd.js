(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.rollup_umd = {}));
}(this, (function (exports) { 'use strict';

	var b = 2;

	var a = 1;

	exports.a = a;
	exports.b = b;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
