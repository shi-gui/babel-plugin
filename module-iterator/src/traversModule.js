const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const DependencyNode = require("./DependencyNode");
const traverse = require('@babel/traverse').default;

// 定义import的类型
const IMPORT_TYPE = {
  deconstruct: "deconstruct", // import { a, b as bb} from 'aa'; （解构引入）
  default: "default", // import b from 'b'; （默认引入）
  namespace: "namespace", // import * as c from 'cc';（命名空间引入）
};

// ts、jsx、tsx 等用的 babel 插件不同，要根据 extname 来做不同的插件的引入
function resolveBabelSyntaxtPlugins(modulePath) {
  const plugins = [];

  if ([".tsx", ".jsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("jsx");
  }
  if ([".ts", ".tsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("typescript");
  }

  return plugins;
}

/**
 * @description:
 * @param {*} curModulePath  根路径地址（即入口文件）
 * @param {*} dependencyGrapthNode
 * @param {*} allModules
 * @return {*}
 */
function traverseJsModule(curModulePath, dependencyGrapthNode, allModules) {
  // 读取源码
  const sourceCode = fs.readFileSync(curModulePath, {
    encoding: "utf-8",
  });
  dependencyGrapthNode.path = curModulePath;

  // 解析成ast
  const ast = parser.parse(sourceCode, {
    sourceType: "unambiguous",
    plugins: resolveBabelSyntaxtPlugins(curModulePath),
  });

  traverse(ast, {
    ImportDeclaration(path) {
      // 收集import 信息
      // 递归处理依赖模块
      console.log(path)
      traverseJsModule(subModulePath, subModule, allModules);
      dependencyGrapthNode.subModules[subModule.path] = subModule;
    },
    ExportDeclaration(path) {
      //收集 export 信息
    },
  });
  allModules[curModulePath] = dependencyGrapthNode;
}

module.exports = function (curModulePath) {
  const dependencyGraph = {
    root: new DependencyNode(),
    allModules: {},
  };
  traverseJsModule(
    curModulePath,
    dependencyGraph.root,
    dependencyGraph.allModules
  );

  return dependencyGraph;
};
