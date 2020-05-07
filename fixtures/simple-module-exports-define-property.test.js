// @expected a b c d
Object.defineProperty(module.exports, 'a', {value: 1});
Object.defineProperty(exports, 'b', {get: () => 2});
Reflect.defineProperty(module.exports, 'c', {value: 3});
Reflect.defineProperty(exports, 'd', {get: () => 4});
{
  let Object;
  Object.defineProperty(module.exports, '_a', {value: -1});
  let Reflect;
  Reflect.defineProperty(exports, '_b', {value: -2});
}
