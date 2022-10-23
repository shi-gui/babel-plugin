const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { transformFromAstSync } = require("@babel/core");
const autoTrackPlugin = require("./plugin/auto-track-plugin");

// 1、将源码读出来
const sourceCode = fs.readFileSync(path.join(__dirname, "./sourceCode.js"), {
  encoding: "utf-8",
});

// 2、通过@babel/parser 转换源码成ast
const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
});

// 3、应用插件
const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [
    [
      autoTrackPlugin,
      {
        trackerPath: "tracker",
      },
    ],
  ],
});

console.log(code)