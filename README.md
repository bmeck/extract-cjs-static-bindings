just run `npm t` and look in the fixtures folder... will have to write this all up later.

# Design Goals

## Static Only

Pick up "static" bindings on the module exports as found in CJS source texts. For some forms of code, `export * from` in particular, they will be a best effort and might not be picked up. A variety of workflows like `module.exports = require(...)` are not problematic even though they have similar effects.

## Lenient

If a binding is a constant, but ambiguous if it is actually exported, include it. In reality this would mean

```js
if (isTuesday()) {
  exports.taco = true;
}
```

Would always list `taco` as exported.

## Conventional

Compiled output contains things like `__esModule`, a best effort will be made to pick up on those.

## Algorithms

### Static member expressions

When a member expression is found, if the property name is a non-computed value it is treated as a static member expression.

### Export target references

When a reference to the static member expression `module.exports` is found and `module` is a free variable it will be treated as a valid exports target with the `replacement` flag set to `true`.

When a reference to `exports` is found and `exports` is a free variable it will be treated as a valid exports target with the replacement flag set to false.

### Static Literals

String, number, boolean, and null literals will be treated as static literals.

### Static property providers

When an object literal is found it is treated as a static property provider. Any property which has a non-computed name that is a static literal or identifier will be treated a static property provided by the literal.

When a call expression is found calling a free variable `require` with a static literal as its only argument. it is treated as a static property provider. Create a dependency on the result of resolving the argument against the current module path. The properties provided are the static exports the dependency. Note: this requires a complete graph traversal due to cycles.

### Simple assignments

When an assignment expression is found:

* if the left hand side is a static member expression that has a valid export target as the object. mark the property of the left hand side as exportable and hold onto the right hand side.

* if the left hand side is a valid export target with the `replacement` flag set and the right hand side is a static property provider. mark the right hand side as a spread provider.

### Defines

When a call expression is found calling either the static member expression `Object.defineProperty` or `Reflect.defineProperty`, the corresponding object identifier as a free variable, the first argument being a valid exports target, and the second argument being a static literal. Mark the value of the second argument as being exportable and hold onto the 3rd argument with the `descriptor` flag set to `true`.

When a call expression is found calling either the static member expression `Object.defineProperties` with the first argument being a valid exports target and the second argument being a static property provider. Mark the value of the second argument as a spread provider with the `descriptor` flag set to `true`.

### IIFEs

If a call expression is found that has a function literal as its callee, it will be treated as an IIFE (Immediately Invoked Function Expression).

### Functions

When a function is found if it is not an IIFE ignore anything exportable inside of the function.

### Static exports

After completely parsing the current module source text and all dependencies. The static exports of the current module are the aggregation of the exportable names in the current module and the static exports of all dependencies.
