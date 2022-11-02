const acorn = require("acorn");

// 通过一个map来维护插件列表
const syntaxPlugins = {
  literal: require("./plugin/literal"),
  liuhua: require("./plugin/guangKeyword"),
};

const defaultOptions = {
  plugins: [],
};

function parse(code, options) {
  const resolvedOptions = Object.assign({}, defaultOptions, options);

  const newParser = resolvedOptions.plugins.reduce((Parser, pluginName) => {
    let plugin = syntaxPlugins[pluginName];
    return plugin ? Parser.extend(plugin) : Parser;
  }, acorn.Parser);

  return newParser.parse(code, {
    locations: true,
  });
}

module.exports = {
  parse,
};
