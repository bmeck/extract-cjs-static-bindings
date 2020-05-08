// @expected a b c d e f g h i j k l m n o p q r s t u v w x y z
// @ts-nocheck
exports.a = 1;
label: exports.b = 2;
throw exports.c = 3;
;(
  exports.d = 4
);
;[
  exports.e = 5,
  ...exports.f = 6,
];
{
  exports.g = 7
};
Object(
  exports.h = 8
);
!(
  exports.i = 9
);
;(exports.j = 10) +
  (exports.k = 11) ||
  (exports.l = 12) *
  (exports.m = 13)
;
;(exports.n = 14, exports.o = 15);
import(exports.p = 16);
;({
  _: exports.q = 17,
  ...(exports.r = 18)
});
;(exports.s = 19)`${exports.t = 20}`;
`${exports.u = 21}`;
void (exports.v = 22);
typeof (exports.w = 23);
;(exports.x = 24) instanceof (exports.y = 25);
;(class extends (exports.z = 26) {});
