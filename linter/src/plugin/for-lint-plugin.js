const { declare } = require("@babel/helper-plugin-utils");

const forLintPlugin = declare((api, options, dirname) => {
  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      ForStatement(path, state) {
        const errors = state.file.get("errors");
        const testOperator = path.node.test.operator;
        const udpateOperator = path.node.update.operator;

        let sholdUpdateOperator;
        if (["<", "<="].includes(testOperator)) {
          sholdUpdateOperator = "++";
        } else if ([">", ">="].includes(testOperator)) {
          sholdUpdateOperator = "--";
        }

        if (sholdUpdateOperator !== udpateOperator) {
          // 报错我们使用 path 的 buildCodeFrameError 方法，他会构造一个 code frame，标记出当前 node 的位置。（第一个参数是错误信息，第二个参数是 Error 对象）
          const tmp = Error.stackTraceLimit;
          // 设置 Error.stackTraceLimit 为 0 ，这样可以去掉 stack 的信息
          Error.stackTraceLimit = 0;
          errors.push(
            path.get("update").buildCodeFrameError("for direction error", Error)
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

module.exports = forLintPlugin;
