const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { transformFromAstSync } = require("@babel/core");
const autoI18nPlugin = require("./plugin/auto-i18n-plugin");

// 1、读源码
const sourceCode = fs.readFileSync(path.join(__dirname, "./sourceCode.js"), {
  encoding: "utf-8",
});

// 2、parse成ast
const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["jsx"],
});

// 3、插件自动国际化
const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [
    [
      autoI18nPlugin,
      {
        outputDir: path.resolve(__dirname, "./output"),
      },
    ],
  ],
});

console.log(code);