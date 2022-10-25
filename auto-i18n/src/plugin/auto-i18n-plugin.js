const { declare } = require("@babel/helper-plugin-utils");
const fse = require('fs-extra');
const path = require('path');
const generate = require('@babel/generator').default;

// 生成不同的语言包中唯一key
let intlIndex = 0;
function nextIntlKey() {
  ++intlIndex;
  return `intl${intlIndex}`;
}
const autoTrackPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  // 生成替换节点
  function getReplaceExpression(path, value, intlUid) {
    const expressionParams = path.isTemplateLiteral()
      ? path.node.expressions.map((item) => generate(item).code)
      : null;
    let replaceExpression = api.template.ast(
      `${intlUid}.t('${value}'${
        expressionParams ? "," + expressionParams.join(",") : ""
      })`
    ).expression;
    if (
      path.findParent((p) => p.isJSXAttribute()) &&
      !path.findParent((p) => p.isJSXExpressionContainer())
    ) {
      replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
    }
    return replaceExpression;
  }

  // 收集替换的key和value， 保存到file中
  function save(file, key, value) {
    const allText = file.get("allText");
    allText.push({
      key,
      value,
    });
    file.set("allText", allText);
  }

  return {
    // 遍历visitor前调用
    pre(file) {
      file.set('allText', []);
    },

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
      // StringLiteral 和 TemplateLiteral 节点，用 state.intlUid + '.t' 的函数调用语句来替换原节点
      // 替换完以后要用 path.skip 跳过新生成节点的处理，不然就会进入无限循环
      StringLiteral(path, state) {
        if (path.node.skipTransform) {
          return;
        }
        let key = nextIntlKey();
        save(state.file, key, path.node.value);

        const replaceExpression = getReplaceExpression(
          path,
          key,
          state.intlUid
        );
        path.replaceWith(replaceExpression);
        path.skip();
      },
      // 模版字符串需要吧 ${} 表达式的部分替换为 {placeholder} 的占位字符串。
      TemplateLiteral(path, state) {
        if (path.node.skipTransform) {
          return;
        }
        const value = path
          .get("quasis")
          .map((item) => item.node.value.raw)
          .join("{placeholder}");
        if (value) {
          let key = nextIntlKey();
          save(state.file, key, value);

          const replaceExpression = getReplaceExpression(
            path,
            key,
            state.intlUid
          );
          path.replaceWith(replaceExpression);
          path.skip();
        }
      },
    },
    // 遍历visitor后调用
    post(file) {
      const allText = file.get('allText');
      const intlData = allText.reduce((obj, item) => {
          obj[item.key] = item.value;
          return obj;
      }, {});

      const content = `const resource = ${JSON.stringify(intlData, null, 4)};\nexport default resource;`;
      fse.ensureDirSync(options.outputDir);
      fse.writeFileSync(path.join(options.outputDir, 'zh_CN.js'), content);
      fse.writeFileSync(path.join(options.outputDir, 'en_US.js'), content);
    },
  };
});

module.exports = autoTrackPlugin;
