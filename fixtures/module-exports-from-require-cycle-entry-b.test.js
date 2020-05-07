// @expected a b
module.exports = require('./module-exports-from-require-cycle-entry-a.test.js');
exports.b = 1;
