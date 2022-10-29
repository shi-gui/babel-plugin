// 混淆 - 替换变量名字等
const { declare } = require("@babel/helper-plugin-utils");

const base54 = (function () {
  var DIGITS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
  return function (num) {
    var ret = "";
    do {
      ret = DIGITS.charAt(num % 54) + ret;
      num = Math.floor(num / 54);
    } while (num > 0);
    return ret;
  };
})();

const ManglePlugin = declare((api, options, dirname) => {
  return {
    pre(file) {
      // 基于这个 uid 来获取唯一的名字
      file.set("uid", 0);
    },
    visitor: {
      // 遍历所有会生成作用域的节点，包括 FunctionDeclaration、BlockStatement 等，而这些节点有一个别名，叫 Scopable
      Scopable: {
        // 如果只指定了一个函数，那就是 enter 阶段会调用(比如 FunctionDeclaration(path, state) {} // 进入节点时调用)
        enter(path, state) {}, // 进入节点时调用
        // 离开节点时调用
        exit(path, state) {
          let uid = state.file.get("uid");
          //   取出 path.scope.bindings，遍历每一个 binding，然后通过 rename 的 api 来进行改名。
          Object.entries(path.scope.bindings).forEach(([key, binding]) => {
            // scope.bindings 当前作用域内声明的所有变量
            if (binding.mangled) return;
            binding.mangled = true;
            // generateUid(name) 生成作用域内唯一的名字
            const newName = path.scope.generateUid(base54(uid++));
            binding.path.scope.rename(key, newName);
          });
          state.file.set("uid", uid);
        },
      },
    },
  };
});

module.exports = ManglePlugin;
