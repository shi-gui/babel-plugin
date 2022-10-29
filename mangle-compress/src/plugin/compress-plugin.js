/*
 * @Author: liuhua
 * @Date: 2022-10-29 10:06:19
 * @LastEditors: liuhua
 * @LastEditTime: 2022-10-29 11:54:00
 * @Description: 压缩，这里只是处理两种情况
 *  删除 return 之后的不会执行到的语句
 *  删除没有被使用的变量声明
 */

const { declare } = require("@babel/helper-plugin-utils");

function canExistAfterCompletion(path) {
  // return 之后是可以有函数声明的，会做变量提升，还有如果是 var 声明的变量，也会做提升，所以要去掉这两种情况。
  return (
    path.isFunctionDeclaration() ||
    path.isVariableDeclaration({
      kind: "var",
    })
  );
}

const CompressPlugin = declare((api, options, dirname) => {
  return {
    visitor: {
      // 删除return 之后不会被执行的语句
      BlockStatement(path) {
        const statementPaths = path.get("body");
        let purge = false;
        for (let i = 0; i < statementPaths.length; i++) {
          if (statementPaths[i].isCompletionStatement()) {
            purge = true;
            continue;
          }
          if (purge && !canExistAfterCompletion(statementPaths[i])) {
            statementPaths[i].remove();
          }
        }
      },
      // 删除没有使用的变量声明
      Scopable(path) {
        Object.entries(path.scope.bindings).forEach(([key, binding]) => {
          // ! binding.reference 是否被引用
          if (!binding.referenced) {
            // 没有被引用且带有纯函数注释的,直接删除整个path
            if (binding.path.get("init").isCallExpression()) {
              const comments = binding.path.get("init").node.leadingComments; //拿到节点前的注释
              if (comments && comments[0]) {
                if (comments[0].value.includes("PURE")) {
                  binding.path.remove();
                  return;
                }
              }
            }
            // ! scope.isPure 判断节点是否是没有副作用的, 函数调用他是分析不了,需要单独处理
            if (!path.scope.isPure(binding.path.node.init)) {
              // 没有被引用且没有副作用的,保留函数调用
              binding.path.parentPath.replaceWith(
                api.types.expressionStatement(binding.path.node.init)
              );
            } else {
              binding.path.remove();
            }
          }
        });
      },
    },
  };
});

module.exports = CompressPlugin;
