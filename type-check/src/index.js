const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { transformFromAstSync } = require("@babel/core");
// const TypeCheckPlugin = require("./plugin/type-check-plugin");
const TypeCheckFnPlugin = require('./plugin/type-check-fn-plugin');

const sourceCode = fs.readFileSync(path.resolve(__dirname, "./sourceCode.ts"), {
  encoding: "utf-8",
});

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["typescript"],
});

const { code } = transformFromAstSync(ast, sourceCode, {
  //   plugins: [[TypeCheckPlugin]],
    plugins: [[TypeCheckFnPlugin]],
});

console.log(code);
