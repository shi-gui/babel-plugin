const { declare } = require("@babel/helper-plugin-utils");

const resolveType = (type) => {
  switch (type) {
    case "StringTypeAnnotation":
      return "string";
    case "NumberTypeAnnotation":
      return "number";
    default:
      "any";
  }
};

const TypeCheckFnPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      CallExpression(path, state) {
        const errors = state.file.get("errors");
        // 实际参数类型
        const argumentsTypes = path.get("arguments").map((item) => {
          return resolveType(item.getTypeAnnotation().type);
        });
        // 通过作用域获取
        const fnName = path.get("callee").toString();
        // 查找某个 binding，从当前作用域一直查找到根作用域
        const functionDeclarePath = path.scope.getBinding(fnName).path;
        const declareParamsTypes = functionDeclarePath
          .get("params")
          .map((item) => {
            return resolveType(item.getTypeAnnotation().type);
          });
        argumentsTypes.forEach((item, index) => {
          if (item !== declareParamsTypes[index]) {
            const temp = Error.stackTraceLimit;
            Error.stackTraceLimit = 0;
            errors.push(
              errors.push(
                path
                  .get("arguments." + index)
                  .buildCodeFrameError(
                    `${item} can not assign to ${declareParamsTypes[index]}`,
                    Error
                  )
              )
            );
            Error.stackTraceLimit = temp;
          }
        });
      },
    },
    post(file) {
      console.log(file.get("errors"));
    },
  };
});

module.exports = TypeCheckFnPlugin;
