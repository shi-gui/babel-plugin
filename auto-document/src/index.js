const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { transformFromAstSync } = require("@babel/core");
const autoDocumentPlugin = require("./plugin/auto-document-plugin");

// 读文件
const sourceCode = fs.readFileSync(path.join(__dirname, "./sourceCode.ts"), {
  encoding: "utf8",
});

// parse 成ast
const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["typescript"],
});

// 应用插件
const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [
    [
      autoDocumentPlugin,
      {
        outputDir: path.resolve(__dirname, "./docs"),
        format: "html",
      },
    ],
  ],
});

console.log(code);
