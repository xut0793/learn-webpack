# Webpack 手册

1. 基础入门
  1. 什么是 webpack？webpack 用来解决什么问题？
  1. 前端模块化发展简史
  1. webpack 历史
  1. webpack 安装和使用
1. webpack 配置项
  1. entry 配置模块打包的入口
  1. output 配置模块打包结果出口
  1. resolve 配置查找模块的规则
  1. module 配置模块转换的 loader
  1. plugin 配置插件，对编译完成后的内容进行二度加工
  1. externals 配置不需要进行打包的外部扩展
  1. performance 配置构建时如何显示提示信息
  1. stats
  1. targets
  1. optimization 构建优化的选项，压缩、分片等
  1. devtool 配置 js 文件的 source-map
  1. devServer 配置本地开发服务器
  1. 整体配置文件（详细）
1. webpack 项目构建实践
  1. webpack 实现目标：代码转化、模块合并、代码校验、代码切分、代码优化
  1. HTML
  1. CSS
  1. Asset 静态资源
  1. js module
  1. 环境区分
  1. 性能分析
1. webpack-chain 使用
1. webpack 原理浅析
  1. 依赖包管理的原理 `__wepback_require__()`
  1. 代码分割异步加载的原理 `import()`
  1. webpack 源码
  1. tapable 源码
  1. webpack-dev-server 源码
  1. webpack-HMR 源码
  1. 编写 loader
  1. 编写 plugin