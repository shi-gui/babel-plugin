const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const { transformFromAstSync } = require("@babel/core");
const ManglePlugin = require("./plugin/mangle-plugin");
const CompressPlugin = require("./plugin/compress-plugin");

const sourceCode = fs.readFileSync(path.resolve(__dirname, "./sourceCode.js"), {
  encoding: "utf-8",
});

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
});

const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [[ManglePlugin], [CompressPlugin]],
  generatorOpts: {
    comments: false, // 去掉注释
    compact: true, // 去掉空格
  },
});

console.log(code);
