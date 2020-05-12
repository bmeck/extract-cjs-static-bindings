// @expected a b c d e f g h i j k l m n o p q r s t u v w x y z
// @ts-nocheck
this.a = 1;
label: this.b = 2;
throw this.c = 3;
;(
  this.d = 4
);
;[
  this.e = 5,
  ...this.f = 6,
];
{
  this.g = 7
};
Object(
  this.h = 8
);
!(
  this.i = 9
);
;(this.j = 10) +
  (this.k = 11) ||
  (this.l = 12) *
  (this.m = 13)
;
;(this.n = 14, this.o = 15);
import(this.p = 16);
;({
  _: this.q = 17,
  ...(this.r = 18)
});
;(this.s = 19)`${this.t = 20}`;
`${this.u = 21}`;
void (this.v = 22);
typeof (this.w = 23);
;(this.x = 24) instanceof (this.y = 25);
;(class extends (this.z = 26) {});
