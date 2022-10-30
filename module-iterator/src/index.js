const path = require("path");
const traversModule = require("./traversModule");

const dependencyGraph = traversModule(
  path.resolve(__dirname, "../test-project/index.js")
);
console.log(JSON.stringify(dependencyGraph, null, '----'));
