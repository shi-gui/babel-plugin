const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const path = require("path");
const DependencyNode = require("./DependencyNode");

const visitedModules = new Set();

//#region 定义类型
// 定义ImportDeclaration 类型
const IMPORT_TYPE = {
  deconstruct: "deconstruct", // import { a, b as bb} from 'aa'; 解构引入
  default: "default", // import b from 'b';  默认引入
  namespace: "namespace", // import * as c from 'cc'; 命名空间引入
};
// 定义ExportDeclaration类型
const EXPORT_TYPE = {
  all: "all", // export * from 'a'; // 全部导出
  default: "default", // export default b; 默认导出
  named: "named", // export { c as cc }; 命名导出
};
//#endregion

//#region ts、jsx、tsx 等用的 babel 插件不同，要根据 extname 来做不同的插件的引入。
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
//#endregion

// 判断是否是文件夹
function isDirectory(filePath) {
  try {
    // ! fs.statSync() 获取文件信息状态
    return fs.statSync(filePath).isDirectory();
  } catch (e) {}
  return false;
}

/**
 * @description: 
 * @param {*} modulePath 当前引入的绝对路径
 * @return {*} 补全引入模块的后缀，如.js等
 */
function completeModulePath(modulePath) {
  const EXTS = [".tsx", ".ts", ".jsx", ".js"];
  if (modulePath.match(/\.[a-zA-Z]+$/)) {
    return modulePath;
  }

  function tryCompletePath(resolvePath) {
    for (let i = 0; i < EXTS.length; i++) {
      let tryPath = resolvePath(EXTS[i]);
      // 一个一个添加后缀，试错，找到最终存在的
      if (fs.existsSync(tryPath)) {
        return tryPath;
      }
    }
  }

  function reportModuleNotFoundError(modulePath) {
    throw "module not found: " + modulePath;
  }
  // 如果是目录的话，要连同index一起补全
  if (isDirectory(modulePath)) {
    const tryModulePath = tryCompletePath((ext) =>
      path.join(modulePath, "index" + ext)
    );
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  } else if (!EXTS.some((ext) => modulePath.endsWith(ext))) {
    const tryModulePath = tryCompletePath((ext) => modulePath + ext);
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  }
  return modulePath;
}

/**
 * @description: 模块的绝对路径
 * @param {*} curModulePath 当前文件的地址
 * @param {*} requirePath 当前文件引入的模块
 * @return {*}
 */
function moduleResolver(curModulePath, requirePath) {
  requirePath = path.resolve(path.dirname(curModulePath), requirePath);

  // 过滤掉第三方模块
  if (requirePath.includes("node_modules")) {
    return "";
  }
  requirePath = completeModulePath(requirePath);

  if (visitedModules.has(requirePath)) {
    return "";
  } else {
    visitedModules.add(requirePath);
  }
  return requirePath;
}

function traverseJsModule(curModulePath, dependencyGrapthNode, allModules) {
  const moduleFileContent = fs.readFileSync(curModulePath, {
    encoding: "utf-8",
  });
  dependencyGrapthNode.path = curModulePath;

  const ast = parser.parse(moduleFileContent, {
    sourceType: "unambiguous",
    plugins: resolveBabelSyntaxtPlugins(curModulePath),
  });

  traverse(ast, {
    ImportDeclaration(path) {
      // 当前文件引入的模块的绝对路径
      const subModulePath = moduleResolver(
        curModulePath,
        path.get("source.value").node
      );
      if (!subModulePath) {
        return;
      }

      const specifierPaths = path.get("specifiers");
      dependencyGrapthNode.imports[subModulePath] = specifierPaths.map(
        (specifierPath) => {
          // 不同的模块引入方式做不同的处理
          if (specifierPath.isImportSpecifier()) {
            return {
              type: IMPORT_TYPE.deconstruct,
              imported: specifierPath.get("imported").node.name,
              local: specifierPath.get("local").node.name,
            };
          } else if (specifierPath.isImportDefaultSpecifier()) {
            return {
              type: IMPORT_TYPE.default,
              local: specifierPath.get("local").node.name,
            };
          } else {
            return {
              type: IMPORT_TYPE.namespace,
              local: specifierPath.get("local").node.name,
            };
          }
        }
      );

      const subModule = new DependencyNode();
      traverseJsModule(subModulePath, subModule, allModules);
      dependencyGrapthNode.subModules[subModule.path] = subModule;
    },
    ExportDeclaration(path) {
      // 不同导出方式的处理
      if (path.isExportNamedDeclaration()) {
        const specifiers = path.get("specifiers");
        dependencyGrapthNode.exports = specifiers.map((specifierPath) => ({
          type: EXPORT_TYPE.named,
          exported: specifierPath.get("exported").node.name,
          local: specifierPath.get("local").node.name,
        }));
      } else if (path.isExportDefaultDeclaration()) {
        let exportName;
        const declarationPath = path.get("declaration");
        if (declarationPath.isAssignmentExpression()) {
          exportName = declarationPath.get("left").toString();
        } else {
          exportName = declarationPath.toString();
        }
        dependencyGrapthNode.exports.push({
          type: EXPORT_TYPE.default,
          exported: exportName,
        });
      } else {
        dependencyGrapthNode.exports.push({
          type: EXPORT_TYPE.all,
          exported: path.get("exported").node.name,
          source: path.get("source").node.value,
        });
      }
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
