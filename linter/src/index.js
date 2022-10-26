const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { transformFromAstSync } = require("@babel/core");
// const forLintPlugin = require("./plugin/for-lint-plugin");
// const functionLintPlugin = require('./plugin/function-lint-plugin');
const eqLintPlugin = require("./plugin/eq.lint-plugin");

const sourceCode = fs.readFileSync(path.resolve(__dirname, "./sourceCode.js"), {
  encoding: "utf-8",
});

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
});

const { code } = transformFromAstSync(ast, sourceCode, {
  // plugins: [forLintPlugin],
  // plugins: [functionLintPlugin],
  plugins: [
    [
      eqLintPlugin,
      {
        fix: true,
      },
    ],
  ],
  filename: "input.js",
});

console.log(code);
