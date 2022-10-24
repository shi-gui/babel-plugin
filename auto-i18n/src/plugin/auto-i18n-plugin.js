const { declare } = require("@babel/helper-plugin-utils");

const autoTrackPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    // 遍历visitor前调用
    pre(file) {},

    visitor: {
      Program: {
        enter(path, state) {
          let imported;
          // 判断是否引入i18n模块
          path.traverse({
            ImportDeclaration(curPath) {
              const source = curPath.node.source.value;
              if (source === "i18n") {
                imported = true;
              }
            },
          });
          // 如果没有引入，则引入i18n模块
          if (!imported) {
            const uid = path.scope.generateUid("i18n");
            const importAst = api.template.ast(`import ${uid} from 'i18n'`);
            path.node.body.unshift(importAst);
            state.intlUid = uid;
          }

          // 对所有的有 /*i18n-disable*/ 注释的字符串和模版字符串节点打个标记，用于之后跳过处理
          path.traverse({
            "StringLiteral|TemplateLiteral"(path) {
              //leadingComments、innerComments、trailingComments： 表示开始的注释、中间的注释、结尾的注释
              if (path.node.leadingComments) {
                path.node.leadingComments = path.node.leadingComments.filter(
                  (comment, index) => {
                    if (comment.value.includes("i18n-disable")) {
                      path.node.skipTransform = true;
                      return false;
                    }
                    return true;
                  }
                );
              }
              if (path.findParent((p) => p.isImportDeclaration())) {
                path.node.skipTransform = true;
              }
            },
          });
        },
      },
    },
    // 遍历visitor后调用
    post(file) {},
  };
});

module.exports = autoTrackPlugin;
