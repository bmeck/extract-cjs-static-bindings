'use strict';
const filename = process.argv[2];
const txt = require('fs').readFileSync(filename, 'utf8');
if (txt.startsWith('// @expected ') !== true) {
  throw new Error('invalid fixture');
}
/** @type {Set<string>} */
const expected = new Set((
  txt.match(/^\/\/ @expected( (.*)|)$/muy) || ['','']
)[1].split(/\s+/u).filter(Boolean));
const Analyzer = require('./index.js').Analyzer;
const actual = new Analyzer().extractStaticBindings(
  require('path').resolve(filename)
);

const assert = require('assert');
// @ts-ignore - why the?
assert.deepStrictEqual(
  /** @type {string[]} */
  Array.from(actual).sort(),
  /** @type {string[]} */
  Array.from(expected).sort()
);
