const { declare } = require("@babel/helper-plugin-utils");
const doctrine = require("doctrine");
const fse = require('fs-extra');
const path = require('path');
const renderer = require('./render');

// ts 参数类型
function resolveType(tsType) {
  const typeAnnotation = tsType.getTypeAnnotation();
  if (!typeAnnotation) {
    return;
  }
  switch (typeAnnotation.type) {
    case "TSStringKeyword":
      return "string";
    case "TSNumberKeyword":
      return "number";
    case "TSBooleanKeyword":
      return "boolean";
    case "AnyTypeAnnotation":
      return "any";
  }
}
// 注释信息用 doctrine 来 parse，可以解析注释里的 @xxx 信息
function parseComment(commentStr) {
  if (!commentStr) {
    return;
  }
  return doctrine.parse(commentStr, {
    unwrap: true,
  });
}

function generate(docs, format = "json") {
  if (format === "markdown") {
    return {
      ext: ".md",
      content: renderer.markdown(docs),
    };
  } else if (format === "html") {
    return {
      ext: "html",
      content: renderer.html(docs),
    };
  } else {
    return {
      ext: "json",
      content: renderer.json(docs),
    };
  }
}

const autoDocumentPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      // 在全局的 file 对象中放一个 docs 的数组，用于收集信息
      file.set("docs", []);
    },
    visitor: {
      FunctionDeclaration(path, state) {
        const docs = state.file.get("docs");
        docs.push({
          type: "function",
          // 函数名（内部调用的 generate, 同 path.node.id.name 结果相同）
          name: path.get("id").toString(),
          // 函数参数及类型
          params: path.get("params").map((item) => {
            return {
              name: item.toString(),
              type: resolveType(item),
            };
          }),
          // 函数返回值
          return: resolveType(path.get("returnType")),
          doc:
            path.node.leadingComments &&
            parseComment(path.node.leadingComments[0].value),
        });
        state.file.set("docs", docs);
      },
      // ClassDeclaration 的处理复杂一些，要分别提取 constructor、method、properties 的信息。
      ClassDeclaration(path, state) {
        const docs = state.file.get("docs");
        // 需要收集的class信息
        const classInfo = {
          type: "class",
          name: path.get("id").toString(),
          constructorInfo: {},
          methodsInfo: [],
          propertiesInfo: [],
        };
        if (path.node.leadingComments) {
          classInfo.doc = parseComment(path.node.leadingComments[0].value);
        }
        path.traverse({
          ClassProperty(path) {
            classInfo.propertiesInfo.push({
              name: path.get("key").toString(),
              type: resolveType(path),
              doc: [path.node.leadingComments, path.node.trailingComments]
                .filter(Boolean)
                .map((comment) => {
                  return parseComment(comment.value);
                })
                .filter(Boolean),
            });
          },
          ClassMethod(path) {
            if (path.node.kind === "constructor") {
              classInfo.constructorInfo = {
                params: path.get("params").map((item) => {
                  return {
                    name: item.toString(),
                    type: resolveType(item),
                    doc: parseComment(path.node.leadingComments[0].value),
                  };
                }),
              };
            } else {
              classInfo.methodsInfo.push({
                name: path.get("key").toString(),
                params: path.get("params").map((item) => {
                  return {
                    name: item.toString(),
                    type: resolveType(item),
                  };
                }),
                return: resolveType(path),
                doc: parseComment(path.node.leadingComments[0].value),
              });
            }
          },
        });
        docs.push(classInfo);
        state.file.set("docs", docs);
      },
    },
    post(file) {
      const docs = file.get("docs");
      const res = generate(docs, options.format);
      fse.ensureDirSync(options.outputDir);
      fse.writeFileSync(
        path.join(options.outputDir, "docs" + res.ext),
        res.content
      );
    },
  };
});

module.exports = autoDocumentPlugin;
