// @expected a b c d e f
// @ts-nocheck
Object.defineProperty(module.exports, 'a', {value: 1});
Object.defineProperty(exports, 'b', {get: () => 2});
Reflect.defineProperty(module.exports, 'c', {value: 3});
Reflect.defineProperty(exports, 'd', {get: () => 4});
Object.defineProperties(module.exports, {
  e: {value: 5}
});
Object.defineProperties(exports, {
  f: {value: 6}
});
{
  let Object;
  Object.defineProperty(module.exports, '_a', {value: -1});
  let Reflect;
  Reflect.defineProperty(exports, '_b', {value: -2});
}
