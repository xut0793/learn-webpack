# 生产环境构建

- 环境区分
- 长效缓存 hash / chunkhash / comtenthash
- moduleId chunkId 短哈希标识代替 id
- 压缩：构建压缩 / gzip 压缩
- 优化：tree-saking 摇树优化  scope-hositing 作用域提升

tree-saking 相关概念： babel-loader 配置项 module: false, sideEffects 副作用及相关的 package.json.sideEffects, optimization.sideEffects, optimization.usedExports, optimization.providedExports