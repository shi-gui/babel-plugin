const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const chalk = require("chalk");
const { codeFrameColumns } = require("@babel/code-frame");

const sourceCode = fs.readFileSync(path.resolve(__dirname, "./sourceCode.js"), {
  encoding: "utf-8",
});

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
});

/**
 * @description: 要支持函数调用，首先要支持作用域链，因为函数执行会生成一个新的作用域，并且会按照作用域链查找变量。
 * @return {*}
 */
class Scope {
  constructor(parentScope) {
    // parentScope指向父 scope
    this.parent = parentScope;
    //scope 中声明的变量
    this.declarations = [];
  }
  //在作用域中声明变量
  set(name, value) {
    this.declarations[name] = value;
  }
  // 查找本作用域的变量
  getLocal(name) {
    return this.declarations[name];
  }
  // get 方法支持按照作用域链不断向上查找变量
  get(name) {
    let res = this.getLocal(name);
    if (res === undefined && this.parent) {
      res = this.parent.get(name);
    }
    return res;
  }

  has(name) {
    return !!this.getLocal(name);
  }
}

/**
 * @description:定义ast解释器
 * @return {*}
 */
const evaluator = (function () {
  const astInterpreters = {
    // 实现各个节点的支持
    Program(node, scope) {
      node.body.forEach((item) => {
        evaluate(item, scope);
      });
    },
    VariableDeclaration(node, scope) {
      node.declarations.forEach((item) => {
        evaluate(item, scope);
      });
    },
    VariableDeclarator(node, scope) {
      const declareName = evaluate(node.id);
      if (scope.get(declareName)) {
        throw Error("duplicate declare variable：" + declareName);
      } else {
        scope.set(declareName, evaluate(node.init, scope));
      }
    },

    ExpressionStatement(node, scope) {
      return evaluate(node.expression, scope);
    },
    // console.log 是一个 MemberExpression，先从 scope 中把 object 属性对应的值取出来，然后再取改值的 property 对应的属性。
    MemberExpression(node, scope) {
      const obj = scope.get(evaluate(node.object));
      return obj[evaluate(node.property)];
    },
    CallExpression(node, scope) {
      const fn = evaluate(node.callee, scope);
      const args = node.arguments.map((item) => {
        if (item.type === "Identifier") {
          return scope.get(item.name);
        }
        return evaluate(item, scope);
      });
      if (node.callee.type === "MemberExpression") {
        const obj = evaluate(node.callee.object, scope);
        return fn.apply(obj, args);
      } else {
        return fn.apply(null, args);
      }
    },
    BinaryExpression(node, scope) {
      const leftValue = evaluate(node.left, scope);
      const rightValue = evaluate(node.right, scope);
      switch (node.operator) {
        case "+":
          return leftValue + rightValue;
        case "-":
          return leftValue - rightValue;
        case "*":
          return leftValue * rightValue;
        case "/":
          return leftValue / rightValue;
        default:
          throw Error("upsupported operator：" + node.operator);
      }
    },
    Identifier(node, scope) {
      return node.name;
    },
    NumericLiteral(node, scope) {
      return node.value;
    },
  };

  const evaluate = (node, scope) => {
    try {
      return astInterpreters[node.type](node, scope);
    } catch (e) {
      // 如果有不支持的节点类型，通过 code frame 来打印 AST 对应的代码，并且提示不支持
      if (
        e &&
        e.message &&
        e.message.indexOf("astInterpreters[node.type] is not a function") != -1
      ) {
        console.error("unsupported ast type: " + node.type);
        console.error(
          codeFrameColumns(sourceCode, node.loc, {
            highlightCode: true,
          })
        );
      } else {
        console.error(node.type + ":", e.message);
        console.error(
          codeFrameColumns(sourceCode, node.loc, {
            highlightCode: true,
          })
        );
      }
    }
  };
  return {
    evaluate,
  };
})();

// 向globalScope 中注入全局变量
const globalScope = new Scope();
globalScope.set("console", {
  log: function (...args) {
    console.log(chalk.green(...args));
  },
  error: function (...args) {
    console.log(chalk.red(...args));
  }
});
evaluator.evaluate(ast.program, globalScope);

// console.log(globalScope);
