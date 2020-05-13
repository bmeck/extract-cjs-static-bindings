"use strict";
// @ts-ignore
const path = require("path");
const performAnalysis = require('./analysis.js');

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
   * @type {Boolean}
   */
  esModule = false;
  /**
   * @param {Iterable<string>} names
   * @param {Iterable<string>} exportsAllFrom
   * @param {Boolean} esModuleFlag
   */
  resolve(names, exportsAllFrom, esModuleFlag) {
    for (const name of names) {
      this.staticAssignmentNames.add(name);
    }
    for (const filename of exportsAllFrom) {
      this.exportsAllNamesFrom.add(filename);
    }
    this.esModuleFlag = esModuleFlag;
  }
}
//#endregion
class Analyzer {
  /**
   * @type {Map<string, {job: AnalysisJob, exportsAllNamesFrom: Set<string>, allNames: Set<string> | null}>}
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
      const txt = require("fs").readFileSync(filename, "utf8");
      const analysis = performAnalysis(txt);
      const job = new AnalysisJob();
      let allNames = null;
      const exportsAllNamesFrom = new Set();
      if (analysis.exportsAllFrom.size !== 0) {
        pendingFullGraph.add(filename);
        for (const specifier of analysis.exportsAllFrom) {
          const dependencyPath = require.resolve(specifier, {
            paths: [path.dirname(filename)],
          });
          exportsAllNamesFrom.add(dependencyPath);
          toVisit.push(dependencyPath);
        }
      }
      else {
        allNames = new Set(analysis.staticAssignmentNames);
      }
      job.resolve(analysis.staticAssignmentNames, exportsAllNamesFrom, analysis.esModuleFlag);
      this.files.set(filename, {
        job,
        exportsAllNamesFrom,
        allNames,
      });
    }
    // TODO: tarjan is a lot faster
    for (const filename of pendingFullGraph) {
      const existing = this.files.get(filename);
      if (!existing) throw new Error("impossible");
      const seen = new Set([filename]);
      const pending = new Set(existing.job.exportsAllNamesFrom);
      const allNames = (existing.allNames = new Set(
        existing.job.staticAssignmentNames
      ));
      while (pending.size) {
        const dependencyName = pending.values().next().value;
        if (!dependencyName) {
          throw new Error("impossible");
        }
        pending.delete(dependencyName);
        if (seen.has(dependencyName)) {
          continue;
        }
        const existingDep = this.files.get(dependencyName);
        if (!existingDep) {
          throw new Error("impossible");
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
      throw new Error("did not fulfill job");
    }
    return existing.allNames;
  }
}
exports.Analyzer = Analyzer;
exports.performAnalysis = performAnalysis;