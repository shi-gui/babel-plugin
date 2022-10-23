// Babel的每个核心插件和预设都将使用这个模块
const { declare } = require("@babel/helper-plugin-utils");
const importModule = require("@babel/helper-module-imports");

const autoTrackPlugin = declare((api, options, dirname) => {
  // 声明你的版本
  api.assertVersion(7);

  return {
    visitor: {
      Program: {
        enter(path, state) {
          path.traverse({
            ImportDeclaration(curPath) {
              // 获取source属性的 path
              const path = curPath.get("source");
              // path.node 当前 AST 节点
              const requirePath = curPath.get("source").node.value;
              // 如果引入了 tracker 模块，就记录 id 到 state，并用 path.stop 来终止后续遍历
              if (requirePath === options.trackerPath) {
                const specifierPath = curPath.get("specifiers.0");
                // default import 和 namespace import 取 id 的方式不一样，需要分别处理下
                if (specifierPath.isImportSpecifier()) {
                  state.trackerImportId = specifierPath.toString();
                } else if (specifierPath.isImportNamespaceSpecifier()) {
                  state.trackerImportId = specifierPath.get("local").toString(); // tracker 模块的 id
                }
                // 停止后续的遍历
                path.stop();
              }
            },
          });
          if (!state.trackerImportId) {
            state.trackerImportId = importModule.addDefault(path, "tracker", {
              nameHint: path.scope.generateUid("tracker"),
            }).name;
            state.trackerAST = api.template.statement(
              `${state.trackerImportId}()`
            )();
          }
        },
      },
      "ClassMethod|ArrowFunctionExpression|FunctionExpression|FunctionDeclaration"(
        path,
        state
      ) {
        const bodyPath = path.get("body");
        // 有函数体
        if (bodyPath.isBlockStatement()) {
          bodyPath.node.body.unshift(state.trackerAST);
        } else {
          // 没有函数体，需要包装一下
          const ast = api.template.statement(
            `{${state.trackerImportId}();return PREV_BODY;}`
          )({ PREV_BODY: bodyPath.node });
          bodyPath.replaceWith(ast);
        }
      },
    },
  };
});

module.exports = autoTrackPlugin;
