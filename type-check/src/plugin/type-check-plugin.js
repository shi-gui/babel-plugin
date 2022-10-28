const { declare } = require("@babel/helper-plugin-utils");

const resolveType = (type) => {
  switch (type) {
    case "TSStringKeyword":
      return "string";
    case "NumberTypeAnnotation":
      return "number";
    default:
      "any";
  }
};

const TypeCheckPlugin = declare((api, options, dirname) => {
  // 指定版本，如果是babel6调用这个插件就会报错，只能是babel7调用
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      VariableDeclarator(path, state) {
        const errors = state.file.get("errors");
        // path.getTypeAnnotation 的 api 来获取声明的类型
        const leftType = resolveType(path.get("id").getTypeAnnotation().type);
        const rightType = resolveType(
          path.get("init").getTypeAnnotation().type
        );

        if (leftType !== rightType) {
          const tmp = Error.stackTraceLimit;
          // 将其设置为0禁用堆栈跟踪收集
          Error.stackTraceLimit = 0;
          errors.push(
            path
              .get("init")
              .buildCodeFrameError(`${rightType}不能赋值给${leftType}类型`)
          );
          Error.stackTraceLimit = tmp;
        }
      },
    },
    post(file) {
      console.log(file.get("errors"));
    },
  };
});

module.exports = TypeCheckPlugin;
