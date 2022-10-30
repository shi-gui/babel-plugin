
module.exports = class DependencyNode {
  /**
   * @description: 收集每个模块的信息
   * @param {*} path 模块当前路径
   * @param {*} imports 什么模块引入了什么变量
   * @param {*} exports 导出了什么变量
   * @return {*}
   */    
  constructor(path = "", imports = {}, exports = []) {
    this.path = path;
    this.imports = imports;
    this.exports = exports;
    this.subModules = {};
  }
};
