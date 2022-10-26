const { declare } = require("@babel/helper-plugin-utils");

const functionLintPlugin = declare((api, options, dirname) => {
  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      // 对函数重新赋值，那么要处理的就是赋值表达式 AssignmentExpression
      AssignmentExpression(path, state) {
        const errors = state.file.get("errors");
        const assignTarget = path.get("left").toString();

        // 获取变量的引用需要用 path.scope.getBinding 的 api，从作用域中查找 binding，然后判断声明的节点是否是一个 FunctionDeclaration 或 FunctionExpression。
        const binding = path.scope.getBinding(assignTarget);
        if (binding) {
          if (
            binding.path.isFunctionDeclaration() ||
            binding.path.isFunctionExpression()
          ) {
            const tmp = Error.stackTraceLimit;
            Error.stackTraceLimit = 0;
            errors.push(
              path.buildCodeFrameError("can not reassign to function", Error)
            );
            Error.stackTraceLimit = tmp;
          }
        }
      },
    },
    post(file) {
      console.log(file.get("errors"));
    },
  };
});

module.exports = functionLintPlugin;
