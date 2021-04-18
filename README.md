# Webpack 手册

1. 基础入门
  1. 什么是 webpack？webpack 用来解决什么问题？
  1. 前端模块化发展简史
  1. webpack 历史
  1. webpack 安装和基本使用
  1. webpack 世界一切皆模块
1. webpack 配置项
  1. context 配置全局上下文路径
  1. entry 配置模块打包的入口
  1. targets 配置最终构建目标环境
  1. output 配置模块打包结果出口
  1. resolve 配置查找模块的规则
  1. module 配置模块转换的 loader
  1. plugin 配置插件，对编译完成后的内容进行二度加工
  1. performance 配置构建时如何控制预设的性能阀值
  1. stats 配置如何显示构建信息
  1. externals 配置不需要进行打包的外部扩展
  1. optimization 构建优化的选项，压缩、分片等
  1. devtool 配置 js 文件的 source-map
  1. devServer 配置本地开发服务器
  1. 整体配置文件
1. webpack 项目构建实践
  实现目标：代码转化、模块合并、代码分割、代码压缩、摇树优化、作用域提升、文件指纹、持久缓存、性能优化
  1. html
  1. assets
  1. css
  1. js
  1. dev
  1. prod
  1. perf
1. webpack-chain 使用
1. webpack 原理浅析
  1. 依赖包管理的原理 `__wepback_require__()`
  1. 代码分割异步加载的原理 `import()`
  1. webpack 源码
  1. tapable 源码
  1. webpack-dev-server 源码
  1. webpack-HMR 源码
  1. http-proxy
  1. 编写 loader
  1. 编写 plugin