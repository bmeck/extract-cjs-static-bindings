// @expected a b c d e f g h i j k l m n o q r s t u v w x y z
// @ts-nocheck
module.exports.a = 1;
label: module.exports.b = 2;
throw module.exports.c = 3;
;(
  module.exports.d = 4
);
;[
  module.exports.e = 5,
  ...module.exports.f = 6,
];
{
  module.exports.g = 7
};
Object(
  module.exports.h = 8
);
!(
  module.exports.i = 9
);
;(module.exports.j = 10) +
  (module.exports.k = 11) ||
  (module.exports.l = 12) *
  (module.exports.m = 13)
;
;(module.exports.n = 14, module.exports.o = 15);
// TODO: acorn bug
// import(module.exports.p = 16);
;({
  _: module.exports.q = 17,
  ...(module.exports.r = 18)
});
;(module.exports.s = 19)`${module.exports.t = 20}`;
`${module.exports.u = 21}`;
void (module.exports.v = 22);
typeof (module.exports.w = 23);
;(module.exports.x = 24) instanceof (module.exports.y = 25);
;(class extends (module.exports.z = 26) {});
