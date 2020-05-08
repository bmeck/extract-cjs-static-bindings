"use strict";
// @ts-ignore
const acornWalk = require("acorn-walk");
const path = require('path');

/**
 * @param {Array<(exec: () => void) => void>} fns
 * @param {() => void} then
 */
function all(fns, then) {
  let todo = fns.length;
  for (const fn of fns) {
    let fired = false;
    fn(() => {
      if (fired) {
        throw new Error("cannot refire");
      }
      fired = true;
      todo--;
      if (todo === 0) {
        then();
      }
    });
  }
}

//#region astutils
/**
 * @param {import('estree').Node} target
 */
function isIIFE(target) {
  return (
    target.type === "CallExpression" &&
    (target.callee.type === "FunctionExpression" ||
      target.callee.type === "ArrowFunctionExpression")
  );
}
/**
 * @param {import('estree').Node} target
 */
function isPossibleRequireCall(target) {
  return (
    target.type === "CallExpression" &&
    target.callee.type === "Identifier" &&
    target.callee.name === "require"
  );
}
/**
 * @param {import('estree').Node} target
 * @param {string} name
 */
function identifiesName(target, name) {
  return target.type === "Identifier" && target.name === name;
}
/**
 * @param {import('estree').Node} target
 * @param {string[]} names
 */
function isStaticMemberExpression(target, names) {
  for (const name of names.slice(0, -1)) {
    if (target.type !== "MemberExpression") return false;
    if (target.computed) return false;
    identifiesName(target.object, name);
    target = target.property;
  }
  return identifiesName(target, names[names.length - 1]);
}
/**
 * @param {import('estree').Node} target
 */
function isPossibleObjectDefinePropertyReference(target) {
  return isStaticMemberExpression(target, ["Object", "defineProperty"]);
}
/**
 * @param {import('estree').Node} target
 */
function isPossibleObjectDefinePropertiesReference(target) {
  return isStaticMemberExpression(target, ["Object", "defineProperties"]);
}
/**
 * @param {import('estree').Node} target
 */
function isPossibleReflectDefinePropertyReference(target) {
  return isStaticMemberExpression(target, ["Reflect", "defineProperty"]);
}
/**
 * @param {import('estree').Node} target
 */
function isPossibleModuleExportsReference(target) {
  return isStaticMemberExpression(target, ["module", "exports"]);
}
/**
 * @param {import('estree').Node} target
 */
function isPossibleExportsReference(target) {
  return target.type === "Identifier" && target.name === "exports";
}
/**
 * @param {string} str
 */
function isValidIdentifier(str) {
  return /^(?:\p{ID_Start}|[$_])(\p{ID_Continue}|[$_])*$/u.test(str);
}
//#endregion
//#region scopeutils
/**
 *
 * @param {import('estree').ObjectExpression} target
 */
function gatherProperties(target) {
  const properties = target.properties;
  /**
   * @type {Array<[string, import('estree').Node]>}
   */
  const foundNames = [];
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (property.type !== "Property") {
      continue;
    }
    if (property.computed !== true) {
      if (property.key.type === "Identifier") {
        foundNames.push([String(property.key.name), property.value]);
      }
      if (property.key.type === "Literal") {
        foundNames.push([String(property.key.value), property.value]);
      }
    }
  }
  return foundNames;
}
/**
 * @typedef {'var' | 'let'} ScopeKind
 */
class ScopeStack {
  /**
   * @type {Scope[]}
   */
  scopes = [];
  /**
   * @type {Map<string, ((scopes: ScopeStack) => void)[]>}
   */
  pendingReferences = new Map();
  /**
   * This creates a nested scope that is opened prior too calling fn()
   * and closed after fn() terminates.
   *
   * Any pending reference observers will be notified if a matching binding
   * name is found when the scope is closed.
   *
   * Existing pending references will be dequeued inside of the scope.
   * This prevents outer references from being leaked into an inner scope.
   * For example,
   *
   * ```js
   * a = 1;
   * {
   *   let a;
   * }
   * ```
   *
   * Will not notify `a` from `a = 1` when the block scope closes, even though
   * the block scope does have a binding named `a`.
   * 
   * If there are no scopes left, all remaining pending references will be
   * notified.
   *
   * @param {ScopeKind} kind
   * @param {() => void} fn
   */
  withScope(kind, fn) {
    const scope = new Scope(kind);
    const oldRefs = this.pendingReferences;
    this.pendingReferences = new Map();
    this.scopes.push(scope);
    fn();
    for (const [name, observers] of this.pendingReferences.entries()) {
      if (scope.hasName(name)) {
        this.pendingReferences.delete(name);
        for (const observer of observers) {
          observer(this);
        }
      }
    }
    this.scopes.pop();
    for (const [name, observers] of oldRefs) {
      const existing = this.pendingReferences.get(name) || [];
      existing.push(...observers);
      this.pendingReferences.set(name, existing);
    }
    if (this.scopes.length === 0) {
      for (const [name, observers] of this.pendingReferences.entries()) {
        this.pendingReferences.delete(name);
        for (const observer of observers) {
          observer(this);
        }
      }
    }
  }
  /**
   * This places an observer for a binding that will be fired when a scope
   * with that binding name is closed. This is need because not all binding
   * names are known up front in JS. For example:
   *
   * ```js
   * exports.a = 1;
   * let exports;
   * ```
   *
   * @param {string} name
   * @param {(scopes: ScopeStack) => void} onResolved
   */
  addBindingReference(name, onResolved) {
    let existing = this.pendingReferences.get(name) || [];
    existing.push(onResolved);
    this.pendingReferences.set(name, existing);
  }
  /**
   * This declares a binding kind onto the current scope stack.
   *
   * Pending references will not be notified.
   *
   * @param {ScopeKind} kind
   * @param {string} name
   */
  declareBinding(kind, name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].kind === kind) {
        this.scopes[i].addName(name);
        return;
      }
    }
    throw Error(
      "unable to declare scope binding without matching scope of kind " + kind
    );
  }
}
class Scope {
  /**
   * @type {ScopeKind}
   */
  kind;
  /**
   * @type {Set<string>}
   */
  bindings = new Set();
  /**
   * @param {ScopeKind} kind
   */
  constructor(kind) {
    this.kind = kind;
  }
  /**
   * @param {string} name
   */
  hasName(name) {
    return this.bindings.has(name);
  }
  /**
   * @param {string} name
   */
  addName(name) {
    this.bindings.add(name);
  }
}
//#endregion
//#region walkutils
/**
 * @typedef { (node: import('estree').Node, state: WalkState)=>void } SubWalkMethod
 * @typedef { 'iife' | 'pattern' | null } SpecialForm
 * @typedef {
    {
      scopes: ScopeStack,
      declarationKinds: ScopeKind[],
      as: SpecialForm
    }
  } WalkState 
 */
/**
 * @param {WalkState} state
 * @param {NonNullable<WalkState['as']>} as
 * @param {()=>void} fn
 */
function withSpecialScope(state, as, fn) {
  if (state.as !== null) {
    throw new Error("already in a special walk scope");
  }
  state.as = as;
  fn();
  if (state.as !== null) {
    throw new Error(`special walk scope ${as} was not handled`);
  }
}
/**
 * @param {WalkState} state
 * @param {NonNullable<WalkState['as']>} as
 */
function assertInSpecialScope(state, as) {
  if (state.as !== as) {
    throw new Error("expected to be in a " + as + " walk scope");
  }
  state.as = null;
}
/**
 * @param {WalkState} state
 * @param {NonNullable<WalkState['as']>} as
 */
function consumeIfInSpecialScope(state, as) {
  if (state.as !== as) {
    return false;
  }
  state.as = null;
  return true;
}
//#endregion
//#region jobstructs
class AnalysisJob {
  /**
   * @type {Set<string>}
   */
  staticAssignmentNames = new Set();
  /**
   * @type {Set<string>}
   */
  exportsAllNamesFrom = new Set();
  /**
   * @param {Iterable<string>} names
   * @param {Iterable<string>} exportsAllFrom
   */
  resolve(names, exportsAllFrom) {
    for (const name of names) {
      this.staticAssignmentNames.add(name);
    }
    for (const filename of exportsAllFrom) {
      this.exportsAllNamesFrom.add(filename);
    }
  }
}
class Analyzer {
  /**
   * @type {Map<string, {job: AnalysisJob, allNames: Set<string> | null}>}
   */
  files = new Map();
  /**
   * @param {string} filename
   */
  extractStaticBindings(filename) {
    const toVisit = [filename];
    /**
     * This is used to track indirect exports
     * Effectively like tracking `export * from`
     * It needs to wait until the full graph is traversed so that cycles
     * Properly get their full list of names.
     * @type {Set<string>}
     */
    const pendingFullGraph = new Set();
    while (toVisit.length) {
      const filename = toVisit.pop();
      if (!filename) {
        continue;
      }
      if (this.files.has(filename)) {
        continue;
      }
      const job = new AnalysisJob();
      this.files.set(filename, {
        job,
        allNames: null
      });
      performAnalysis(filename, job);
      if (job.exportsAllNamesFrom.size !== 0) {
        pendingFullGraph.add(filename);
        for (const filename of job.exportsAllNamesFrom) {
          toVisit.push(filename);
        }
      } else {
        const existing = this.files.get(filename);
        if (!existing) throw new Error('impossible');
        existing.allNames = new Set(job.staticAssignmentNames);
      }
    }
    // TODO: tarjan is a lot faster
    for (const filename of pendingFullGraph) {
      const existing = this.files.get(filename);
      if (!existing) throw new Error('impossible');
      const seen = new Set([filename]);
      const pending = new Set(existing.job.exportsAllNamesFrom);
      const allNames = existing.allNames = new Set(existing.job.staticAssignmentNames);
      while (pending.size) {
        const dependencyName = pending.values().next().value;
        if (!dependencyName) {
          throw new Error('impossible');
        }
        pending.delete(dependencyName);
        if (seen.has(dependencyName)) {
          continue
        }
        const existingDep = this.files.get(dependencyName);
        if (!existingDep) {
          throw new Error('impossible');
        }
        seen.add(dependencyName);
        if (existingDep.allNames) {
          for (const name of existingDep.allNames) {
            allNames.add(name);
          }
        } else {
          for (const name of existingDep.job.staticAssignmentNames) {
            allNames.add(name);
          }
          for (const name of existingDep.job.exportsAllNamesFrom) {
            if (!seen.has(name)) {
              pending.add(name);
            }
          }
        }
      }
    }
    const existing = this.files.get(filename);
    if (!existing) {
      throw new Error('did not fulfill job')
    }
    return existing.allNames;
  }
}
//#endregion
/**
 * @param {string} filename
 * @param {AnalysisJob} job
 */
function performAnalysis(filename, job) {
  const txt = require("fs").readFileSync(filename, "utf8");
  // @ts-ignore
  const ast = require("acorn").parse(txt, {
    // @ts-ignore
    ecmaVersion: 11,
    allowReturnOutsideFunction: true,
  });
  /**
   * @type {WalkState}
   */
  const rootState = {
    scopes: new ScopeStack(),
    /**
     * @type {Array<ScopeKind>}
     */
    declarationKinds: [],
    as: null,
  };
  /**
   * @type {Map<string, Array<ReturnType<getValue>>>}
   */
  const staticAssignmentNames = new Map();
  /**
   * @param {import('estree').Node} node 
   * @param {boolean} descriptor
   * @returns {{computed: boolean, value?: any}}
   */
  function getValue(node, descriptor) {
    if (descriptor) {
      if (node.type === 'ObjectExpression') {
        for (const prop of node.properties) {
          if (prop.type === 'Property' && prop.computed !== true) {
            const key = prop.key;
            if (key.type === 'Literal') {
              if (key.value === 'value') {
                const rhs = getValue(prop.value, false);
                if (rhs.computed) return {computed: true};
                return {computed: false, value: rhs.value};
              }
            } else if (key.type === 'Identifier') {
              if (key.name === 'value') {
                const rhs = getValue(prop.value, false);
                if (rhs.computed) return {computed: true};
                return {computed: false, value: rhs.value};
              }
            } 
          }
        }
      }
      return {computed: true};
    }
    if (node.type === 'Literal') {
      return {computed: false, value: node.value};
    }
    return {computed: true};
  }
  /**
   * @param {WalkState} state 
   * @param {string} name 
   * @param {import('estree').Node} value 
   * @param {string[]} requiredFreeVariables 
   * @param {boolean} [descriptor]
   */
  function potentialExportable(state, name, value, requiredFreeVariables, descriptor = false) {
    all(
      requiredFreeVariables.map(name => f => {
        state.scopes.addBindingReference(name, scopeStack => {
          if (scopeStack.scopes.length === 0) f();
        })
      }),
      () => {
        const existing = staticAssignmentNames.get(name) || [];
        existing.push(getValue(value, descriptor));
        staticAssignmentNames.set(name, existing);
      }
    )
  }
  /**
   * 
   * @param {WalkState} state
   * @param {import('estree').Node} provider 
   * @param {string[]} requiredFreeVariables 
   * @param {boolean} [descriptor]
   */
  function potentialSpread(state, provider, requiredFreeVariables, descriptor = false) {
    if (provider.type === 'ObjectExpression') {
      const foundProperties = gatherProperties(provider);
      all(
        requiredFreeVariables.map(name => f => {
          state.scopes.addBindingReference(name, scopeStack => {
            if (scopeStack.scopes.length === 0) f();
          })
        }),
        () => {
          for (const [name, value] of foundProperties) {
            const existing = staticAssignmentNames.get(name) || [];
            existing.push(getValue(value, descriptor));
            staticAssignmentNames.set(name, existing);
          }
        }
      )
    }
  }

  /**
   * @type {Set<string>}
   */
  const exportsAllFrom = new Set();
  acornWalk.recursive(ast, rootState, {
    //#region patterns
    /**
     * @param {import('estree').Identifier} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    Identifier(node, state) {
      if (consumeIfInSpecialScope(state, "pattern")) {
        let kind = state.declarationKinds.slice(-1)[0];
        state.scopes.declareBinding(kind, node.name);
      }
    },
    /**
     * @param {import('estree').RestElement} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    RestElement(node, state, performSubWalk) {
      assertInSpecialScope(state, "pattern");
      withSpecialScope(state, "pattern", () => {
        performSubWalk(node.argument, state);
      });
    },
    /**
     * @param {import('estree').AssignmentPattern} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    AssignmentPattern(node, state, performSubWalk) {
      assertInSpecialScope(state, "pattern");
      withSpecialScope(state, "pattern", () => {
        performSubWalk(node.left, state);
      });
    },
    /**
     * @param {import('estree').ObjectPattern} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    ObjectPattern(node, state, performSubWalk) {
      let { properties } = node;
      assertInSpecialScope(state, "pattern");
      for (let i = 0; i < properties.length; i++) {
        const pattern = properties[i];
        withSpecialScope(state, "pattern", () => {
          performSubWalk(pattern, state);
        });
      }
    },
    /**
     * @param {import('estree').ArrayPattern} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    ArrayPattern(node, state, performSubWalk) {
      let { elements } = node;
      assertInSpecialScope(state, "pattern");
      for (let i = 0; i < elements.length; i++) {
        const pattern = elements[i];
        withSpecialScope(state, "pattern", () => {
          performSubWalk(pattern, state);
        });
      }
    },
    /**
     * @param {import('estree').VariableDeclarator} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    VariableDeclarator(node, state, performSubWalk) {
      let { id, init } = node;
      withSpecialScope(state, "pattern", () => {
        performSubWalk(id, state);
      });
      if (init) {
        performSubWalk(init, state);
      }
    },
    /**
     * @param {import('estree').VariableDeclaration} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    VariableDeclaration(node, state, performSubWalk) {
      let { kind, declarations } = node;
      if (kind === "const") kind = "let";
      state.declarationKinds.push(kind);
      for (let i = 0; i < declarations.length; i++) {
        performSubWalk(declarations[i], state);
      }
      state.declarationKinds.pop();
    },
    //#endregion
    //#region scoping
    /**
     * @param {import('estree').Program} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    Program(node, state, performSubWalk) {
      state.scopes.withScope("var", () => {
        state.scopes.withScope("let", () => {
          const { body } = node;
          for (let i = 0; i < body.length; i++) {
            performSubWalk(body[i], state);
          }
        });
      });
    },
    /**
     * @param {import('estree').Function} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    Function(node, state, performSubWalk) {
      if (consumeIfInSpecialScope(state, "iife")) {
        let { body, params } = node;
        for (let i = 0; i < params.length; i++) {
          withSpecialScope(state, "pattern", () => {
            performSubWalk(params[i], state);
          });
        }
        state.scopes.withScope("var", () => {
          state.scopes.withScope("let", () => {
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
              const { id } = node;
              if (id) {
                state.scopes.declareBinding('var', id.name);
              }
            }
            performSubWalk(body, state);
          });
        });
      } else if (node.type === "FunctionDeclaration" && node.id) {
        state.scopes.declareBinding("let", node.id.name);
      }
    },
    /**
     * @param {import('estree').ClassDeclaration} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    ClassDeclaration(node, state, performSubWalk) {
      if (node.id) {
        state.scopes.declareBinding("let", node.id.name);
      }
      if (node.superClass) {
        performSubWalk(node.superClass, state);
      }
    },
    /**
     * @param {import('estree').CatchClause} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    CatchClause(node, state, performSubWalk) {
      const { param, body } = node;
      state.scopes.withScope('let', () => {
        if (param) {
          state.declarationKinds.push('let');
          withSpecialScope(state, 'pattern', () => {
            performSubWalk(param, state);
          });
          state.declarationKinds.pop();
        }
        performSubWalk(body, state);
      });
    },
    /**
     * @param {import('estree').BlockStatement} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    BlockStatement(node, state, performSubWalk) {
      state.scopes.withScope("let", () => {
        const { body } = node;
        for (let i = 0; i < body.length; i++) {
          performSubWalk(body[i], state);
        }
      });
    },
    //#endregion
    /**
      * @param {import('estree').AssignmentExpression} node
      * @param {WalkState} state
      * @param {SubWalkMethod} performSubWalk
      */
    AssignmentExpression(node, state, performSubWalk) {
      let { left, right } = node;
      if (isPossibleModuleExportsReference(left)) {
        // module.exports =
        if (right.type === "ObjectExpression") {
          potentialSpread(state, right, ['module'], false);
        } else if (isPossibleRequireCall(right)) {
          const call = /**
            * @type {import('estree').CallExpression}
            */ (right);
          if (call.arguments.length === 1) {
            const specifier = call.arguments[0];
            if (specifier.type === "Literal") {
              const specifierString = String(specifier.value);
              state.scopes.addBindingReference('require', (scopeStack) => {
                if (scopeStack.scopes.length === 0) {
                  const { builtinModules } = require("module");
                  if (!builtinModules.includes(specifierString)) {
                    const dependencyPath = require.resolve(specifierString, {
                      paths: [path.dirname(filename)],
                    });
                    exportsAllFrom.add(dependencyPath);
                  }
                }
              });
            }
          }
        }
      } else if (
        left.type === "MemberExpression" &&
        left.computed !== true &&
        left.property.type === "Identifier"
      ) {
        const { name } = left.property;
        if (isPossibleExportsReference(left.object)) {
          // exports.* =
          potentialExportable(state, name, right, ['exports'], false);
        } else if (isPossibleModuleExportsReference(left.object)) {
          // module.exports.* =
          potentialExportable(state, name, right, ['module'], false);
        }
      }
      performSubWalk(left, state);
      performSubWalk(right, state);
    },
    /**
     * @param {import('estree').CallExpression} node
     * @param {WalkState} state
     * @param {SubWalkMethod} performSubWalk
     */
    CallExpression(node, state, performSubWalk) {
      const { callee, arguments: args } = node;
      for (let i = 0; i < args.length; i++) {
        performSubWalk(args[i], state);
      }
      const definePropertyBase = isPossibleObjectDefinePropertyReference(callee)
        ? "Object"
        : isPossibleReflectDefinePropertyReference(callee)
        ? "Reflect"
        : null;
      if (definePropertyBase !== null) {
        if (args.length >= 3) {
          const property = args[1];
          if (property.type === "Literal") {
            const target = args[0];
            const exportBase = isPossibleExportsReference(target)
              ? "exports"
              : isPossibleModuleExportsReference(target)
              ? "module"
              : null;
            if (exportBase !== null) {
              const bindingName = String(property.value);
              potentialExportable(state, bindingName, args[2], [definePropertyBase, exportBase], true);
            }
          }
        }
        return;
      }
      if (isPossibleObjectDefinePropertiesReference(callee)) {
        if (args.length >= 2) {
          const target = args[0];
          const properties = args[1];
          const exportBase = isPossibleExportsReference(target)
            ? "exports"
            : isPossibleModuleExportsReference(target)
            ? "module"
            : null;
          if (exportBase !== null) {
            potentialSpread(state, properties, [exportBase, 'Object'], true);
          }
        }
      }
      if (isIIFE(node)) {
        withSpecialScope(state, "iife", () => {
          performSubWalk(callee, state);
        });
      }
    },
  });
  if (rootState.scopes.scopes.length !== 0) {
    throw new Error('malformed scope chain');
  }
  const interopAssignments = staticAssignmentNames.get('__esModule');
  let isActingAsESM = Boolean(interopAssignments);
  if (interopAssignments) {
    if (staticAssignmentNames.has('default')) {
      if (interopAssignments.some(({computed, value}) => {
        return computed || Boolean(value) !== true
      })) {
        isActingAsESM = false;
      }
    }
  }
  if (isActingAsESM !== true) {
    staticAssignmentNames.delete('default');
  }
  job.resolve(staticAssignmentNames.keys(), exportsAllFrom);
}
module.exports = Analyzer;
