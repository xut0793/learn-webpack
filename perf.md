# 性能优化

[[toc]]

- 量化
  - 速度量化：speed-measure-webpack-plugin
  - 体积量化
    1. 生成 stat.json 在线分析
    1. webpack-bundle-analyzer 图表视图
    1. webpack-visualizer-plugin 饼状视图
- 速度优化
  1. 缩小文件的搜索范围
    1. `exclude / include`
    1. `resolve`: modules / mainFields / extensions / alias
    1. `noParse`
  1. 利用计算机能力优化速度（多核、多进程、多线程、内存空间等）
    1. 使用缓存，加快二次构建速度
      1. babel-loader 开启缓存: `cacheDirectory: true`
      1. terser-webpack-plugin 开启缓存: `cache: true`
      1. 使用 hard-source-webpack-plugin 插件
      1. 稳定 moduleId 和 chunkId，利用 webpack 自身的构建缓存
    1. 并行操作
      1. thread-loader 多线程处理
      1. parallel-webpack 多进程处理
      1. terser-webpack-plugin 开启 parallel 属性
  1. 预构建 `autodll-webpack-plugin`
  1. 预加载 `webpackPrefetch`
  1. 合理使用 `sourceMap`
- 体积优化
  - css 提取独立文件、文件压缩、无用代码删除 --- 见 **css.md**
  - js 文件拆分 `optimization.splitChunks`、异步代码加载、webpack 运行时代码 runtime 提取复用、externals 配置、文件压缩、Tree Shaking、scope hosting --- 见 **js.md**
  - image 图片压缩、转成 base64 嵌入代码
  - icon 类图片使用 css Sprite 来合并图片成一张雪碧图，或者使用字体文件 iconfont。
  - Gzip 压缩
  - IgnorePlugin 插件
- 升级最新版本：`node / npm / webpack`


## 量化

在动手优化之前，我们需要有一个量化的指标，需要知道影响构建时间的问题究竟出在哪里？是某个 chunk 文件太大了，还是哪一个 loader 或者 plugin 耗时太久了等等。并且有时我们以为的优化可能是负优化，所以需要有一个量化的指标可以看出前后对比。

我们可以对通过一些工具对项目进行相应的 **体积** 和 **速度** 分析， 然后针对优化。

### 体积量化

1. 生成 stat.json 在线分析

webpack 官方提供了命令生成 stat.json 文件来帮助我们分析打包结果。
- 生成 stat.json 文件：`webpack --profile --json > stats.json`
- 上传 stat.json 文件到在线分析工具：
  - 官方可视化分析工具 [Webapck Analyse](http://webpack.github.io/analyse/)：生成一个图表，让你可视化了解项目的依赖关系、模块大小及耗时等；
  - [Webpack Visualizer](http://chrisbateman.github.io/webpack-visualizer/)：生成一个饼状图，可视化 bundle 内容，这是在线，也可以使用其插件`webpack-visualizer-plugin`
  - [webpack bundle optimize helper](https://webpack.jakoblind.no/optimize/): 既可看到分析结果，还提供优化建议

可以在网站上直接看到结果，其中包括 webpack 的版本、打包时间、打包过程的 hash 值、模块数量( modules )、chunk 数量、打包生层的静态文件 assets 以及打包的警告和错误数。我们可以分析其提供的内容，进行大致问题的定位。

2. webpack-bundle-analyzer 图表视图

`webpack-bundle-analyzer` 插件是webpack 打包分析的神器，它的界面很好看，而且能很直观的给出每一个打包出来的文件的大小以及各自的依赖，能够更加方便的帮助我们对项目进行分析。

```sh
# 安装
npm i webpack-bundle-analyzer -D
```
`webpack.config.js` 配置
```js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
​
module.exports = {
  // ...
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerPort: 8889, // 指定端口号
      openAnalyzer: false,
    }),
  ]
  // ...
}
```
在构建完成后，会直接启动一个服务，有一个可视化的界面查看构建后的 bundle。具体来说，使用 webpack-bundle-analyzer 能可视化的反映：

- 打包出的文件中都包含了什么；
- 每个文件的尺寸在总体中的占比，哪些文件尺寸大，思考一下，为什么那么大，是否有替换方案，是否使用了它包含的所有代码；
- 模块之间的包含关系；
- 是否有重复的依赖项，是否存在一个库在多个文件中重复？ 或者捆绑包中是否具有同一库的多个版本？
- 是否有相似的依赖库， 尝试使用一种依赖库实现相似的功能。
- 每个文件的压缩后的大小。

webpack4 在 production 环境下默认启动了 ModuleConcatenationPlugin （预编译所有模块到一个闭包中，提升代码在浏览器中的执行速度），它可能会合并webpack-bundle-analyzer 输出中的模块的一部分，从而使报告不太详细。 如果你使用此插件，请在分析过程中将其禁用。设置如下：

```js
module.exports = {
  // ...
  optimization: {
    concatenateModules: false,
  }
};
```
> webpack-bundle-analyzer 其底层也是依赖 stat.json 文件的，通过对 stat.json 的分析，得出最后的分析页面


### webpack-visualizer-plugin 饼状视图

该插件生成一个饼状图，可视化 bundle 内容。

```sh
npm install webpack-visualizer-plugin --dev-save
```
```js
// 分析包内容
const Visualizer = require('webpack-visualizer-plugin');
module.exports = {
  plugins: [
    // 开启 Visualizer
    // 默认输出为 stats.html，这里为 statistics.html
    new Visualizer({
      filename: './statistics.html'
    })
  ],
};
```
然后在浏览器中直接打开 statistics.html 就可以看到分析结果了




### 速度量化 speed-measure-webpack-plugin

`speed-measure-webpack-plugin` 这个插件可以帮助我们分析整个打包的总耗时，以及每一个loader 和每一个 plugins 构建所耗费的时间，从而帮助我们快速定位到可以优化 Webpack 的配置。

```sh
# 安装
npm i speed-measure-webpack-plugin -D
```
vue-cli@2.x 配置 `webpack.config.js`
```js
// 引入此插件，创建一个 plugins 实例 smp，然后包裹 webpack 配置文件即可
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const smp = new SpeedMeasurePlugin();

const config = {
    //...webpack配置
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerPort: 8889, // 指定端口号
        openAnalyzer: false,
      }),
    ]
}

module.exports = smp.wrap(config);
```
在 Vue-cli@3.x 下，对 Webpack 做了深度的封装，很多已经是默认配置了，自定义的配置需要修改 `vue.config.js`
```js
// vue.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  // 该对象会在脚手架内部被 webpack-merge 合并入最终的 webpack 配置。
  configureWebpack: smp.wrap({
    plugins: [
      // 这个要放在所有 plugins 最后
      new BundleAnalyzerPlugin()
    ]
  })
}
```


## 速度优化

1. 缩小文件的搜索范围

1.1 `exclude / include`

配置loader时，通过test、exclude、include缩小需要转译的文件。顾名思义，exclude 指定要排除的文件，include 指定要包含的文件。

- exclude 的优先级高于 include
- 在 include 和 exclude 中使用绝对路径数组
- 尽量避免 exclude，更倾向于使用 include

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.js[x]?$/,
        use: ['babel-loader'],
        include: [path.resolve(__dirname, 'src')]
      }
    ]
  }
}
```

1.2. `resolve`

`resolve` 字段告诉webpack怎么去搜索文件，所以首先要重视resolve字段的配置

```js
module.exports = {
  resolve: {
    /**
     * resolve.modules告诉webpack去哪些目录下寻找第三方模块，默认值为相对路径：['node_modules']，会依次查找./node_modules、../node_modules、../../node_modules。
     * 所以使用绝对路径之后，将只在给定目录中搜索，从而减少模块的搜索层级
    */
    modules: [path.resolve(__dirname, 'node_modules')],

    /**
     * 设置尽量少的值可以减少入口文件的搜索
     * 如果需要开启 Tree Shaking 和 scope hositing 功能，应优先合钐 ES Modjle
    */
    mainFields: ["module", "main"],

    /**
     * 合理配置 resolve.extensions，减少文件拼接后缀的查找
     * 默认值：extensions:['.js', '.json'],当导入语句没带文件后缀时，Webpack会根据extensions定义的后缀列表进行文件查找，所以：
     * 1. 列表值尽量少
     * 2. 频率高的文件类型的后缀写在前面，例如 vue 项目配置 ['.vue', '.js']
     * 3. 源码中的导入语句尽可能的写上文件后缀，如require(./data)写成require(./data.json)
    */
   extensions: ['.vue', '.js',]

    /**
     * 对庞大的第三方模块设置 resolve.alias, 使webpack直接使用库的min文件，避免库内解析
     * 注意：这样会影响Tree-Shaking，适合对整体性比较强的库使用，
     *      如果是像lodash这类工具类的比较分散的库，需要开启 Tree-Shaking，则需要选择构建为 ES 模块的版本，避免使用这种 .min 文件。 
    */
    alias: {
      'vue':patch.resolve(__dirname, './node_modules/vue/dist/vue.min.js'
    }
  }
}
```

1.3 `noParse`

`noParse` 配置项可以让 webpack 忽略对部分没采用模块化规范的文件进行递归解析和处理，这样可以加速打包构建速度。

原因是像 `jQuery / ChartJS`这类庞大而又没有采用模块化的规范书写的库让 webpack 去解析即耗时又没有意义。此时可以用 `noParse` 配置项来排除掉。

另外如果使用 `resolve.alias`配置了`vue.min.js`，则也应该排除解析，因为`vue.min.js`经过构建，已经是可以直接运行在浏览器的、非模块化的文件了。

```js
// 值可以配置成 RegExp、[RegExp]、function
module.exports = {
  module: {
    noParse: [/jquery|chartjs/, /vue\.min\.js$/] }
  }
}
```

2. 利用计算机能力优化速度（多核、多进程、多线程、内存空间等）

充分利用计算机的能力优化速度，比如利用计算机多核、开启多进程、使用内存空间进行缓存等，这是一种利用**空间换取时间**的常规做法。

2.1 使用缓存，加快二次构建速度

如果项目中有缓存的话，在 node_modules 下会有相应的 .cache 目录来存放相应的缓存。

主要关注以下设置
- babel-loader 开启缓存
- terser-webpack-plugin 开启缓存
- 使用 hard-source-webpack-plugin 插件
- 稳定 moduleId 和 chunkId，利用 webpack 自身的构建缓存

babel-loader 开启缓存:
```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.js[x]?$/,
        include: [path.resolve(__dirname, 'src')],
        use: [
          loader: 'babel-loader',
          options: {
            cacheDirectory: true, // 默认缓存目录 node_modules/.cache/babel-loader
          }
        ],
      }
    ]
  }
}
```

terser-webpack-plugin 开启缓存
```js
// config/webpack.common.js
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true, //  默认开启缓存，默认缓存目录 node_modules/.cache/terser-webpack-plugin，传入字符串可以修改路径
        parallel: 4, // 默认开启多进程压缩，开启几个进程来处理压缩，默认是 os.cpus().length - 1
      }),
    ],
  },
  // ...
}
```

HardSourceWebpackPlugin 插件用于缓存 webpack 内部模块处理的中间结果。首次构建时间没有太大变化，但是第二次开始，构建时间大约可以节约 80%。
> HardSourceWebpackPlugin文档中 列出了一些你可能会遇到的问题以及如何解决，例如热更新失效，或者某些配置不生效等，需要注意。

```js
// config/webpack.common.js
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
  plugins: [
    new HardSourceWebpackPlugin(), // 缓存目录 node_modules/.cache/hard-source
  ];
}
```

稳定 moduleId 和 chunkId，利用 webpack 自身的构建缓存

- webpack@4.x 中可以使用 `HashedModuleIdsPlugin` 插件来稳定 moduleId；
- 在webpack@5.x 中可以设置 `optimization.moduleIds / optimization.chunkIds`

```js
module.exports = {
  // webpack@4.x
  plugins: [
    new HashedModuleIdsPlugin()
  ]

  // webpack@5.x
  optimization: {
    /**
     * natural	按使用顺序的数字id。
     * named	对调试更友好的优点的id。用于开发环境调试
     * deterministic	被哈希转化成的小位数值模块名。用于生产环境有利于持久缓存
     * size	专注于让初始下载包大小更小的数字id。
    */
    moduleIds: 'deterministic',
    /**
     * 'natural'	按使用顺序的数字id。
     * 'named'	对调试更友好的优点的id。
     * 'deterministic'	在不同的编译中不变的短数字id。有益于长期缓存。在生产模式中会交替开启。
     * 'size'	专注于让初始下载包大小更小的数字id。
     * 'total-size'	专注于让总下载包大小更小的数字id。
    */
    chunkIds: 'deterministic',
  }
}
```

当程序包依赖性发生变化时，请记住清除缓存，一个陈旧、不兼容的缓存可能会以新的和有趣的方式对你的构建造成严重破坏。
```js
// TODO:清除缓存命令，使用 `npm postinstall` script 自动执行。
```

2.2 并行操作

由于 webpack 运行在 Node.js 之上，任务处理单线程的，但是webpack 的很多工作本身就是并行的，如果 webpack 能同一时间处理多个任务，发挥多核 CPU 电脑的威力，那么对其打包速度的提升肯定是有很大的作用的。

- thread-loader 多线程处理
- parallel-webpack 多进程处理
- terser-webpack-plugin 开启 parallel 属性

webpack 官方推出的一个多进程方案，用来替代之前的 HappyPack。原理和 HappyPack 类似，webpack 每次解析一个模块，thread-loader 会将它及它的依赖分配给 worker 线程中，从而达到多进程打包的目的。

> HappyPack 的作者现在基本上也不维护这个插件了，因为作者对此项目的兴趣正在减弱。他也推荐我们使用 webpack 官方 thread-loader。

使用很简单，直接在我们使用的 loader 之前加上 thread-loader 就行。那么放置在这个 loader 之后的 loader 就会在一个单独的 worker 池中运行。

在 worker 池(worker pool)中运行的 loader 是受到限制的。例如：
- 这些 loader 不能产生新的文件。
- 这些 loader 不能使用定制的 loader API（也就是说，通过插件）。
- 这些 loader 无法获取 webpack 的选项设置。

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.js[x]?$/,
        include: [path.resolve(__dirname, 'src')],
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 3, // 开启几个 worker 进程来处理打包，默认是 os.cpus().length - 1
            }
          },
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true, // 默认缓存目录 node_modules/.cache/babel-loader
            }
          }
        ],
      }
    ]
  }
}
```



3. 预构建

- `DllPlugin` 将允许你在后面的阶段剥离预先构建好的包供 webpack 使用，非常适合像 Vendor 库这样的大型，较少移动的依赖项。但是配置繁琐。
- `autodll-webpack-plugin` 用于替代 DllPlugin，实现了想同的功能，但配置更简单。

```js
// TODO: 待补充示例代码
```

4. 预加载资源 webpackPrefetch

使用 webpackPrefetch 来提前预加载一些资源，意思就是 将来可能需要一些模块资源，在核心代码加载完成之后带宽空闲的时候再去加载需要用到的模块代码。

5. 合理使用 sourceMap

源地图（Source maps）是调试时用到的关键工具，但是生成它们将花费一定时间，改动 webpack 的 devtools 选项并，择一个合适的方案。 `cheap-source-map` 方案在构建性能和可调试性间取得了不错的平衡。






## 体积优化

### 代码压缩、代码拆分、无用代码删除、公共模块代码复用

- css 提取独立文件、文件压缩、无用代码删除 --- 见 **css.md**
- js 文件拆分 `optimization.splitChunks`、异步代码加载、webpack 运行时代码 runtime 提取复用、externals 配置、文件压缩、Tree Shaking、scope hosting --- 见 **js.md**
- image 图片压缩、转成 base64 嵌入代码
- icon 类图片使用 css Sprite 来合并图片成一张雪碧图，或者使用字体文件 iconfont。

### Gzip 压缩

### IgnorePlugin 插件

`IgnorePlugin` 是 webpack 的内置插件，作用是忽略第三方包部分指定目录的代码。

例如: moment (2.24.0版本) 会将所有本地化内容和核心功能一起打包，我们就可以使用 IgnorePlugin 在打包时忽略本地化内容。
```js
//webpack.config.js
module.exports = {
  plugins: [
      //忽略 moment 下的 ./locale 目录
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
  ]
}
```
在使用的时候，如果我们需要指定语言，那么需要我们手动的去引入语言包，例如，引入中文语言包:
```js
import moment from 'moment';
import 'moment/locale/zh-cn';// 手动引入
```
index.js 中只引入 moment，打包出来的 bundle.js 大小为 263KB，如果配置了 IgnorePlugin，单独引入 `moment/locale/zh-cn`，构建出来的包大小为 55KB。


## 保持版本最新

包括 `node / npm / webpack`

这个是 webpack 性能优化的万能膏药，升级版本必定能带来性能提升，而且提升很明显。

在每一个版本的更新，webpack 内部肯定会做很多优化，而 webpack 是依赖 Node 的 js 运行环境，升级 Node 对应的版本，webpack 的速度肯定也能够获得提升。同时新版本的包管理工具（Npm、Yarn）也可以更快的帮助我们分析一些包的依赖和引入，从而提高打包速度。

> 说不定在 webpack5.0 出来之后，我们今天讲到的大部分性能优化方法都会被集成到 webpack 自身中去，我们只需要通过几个简单的配置就能完成性能配置。


## 参考链接
- [保持 webpack 快速运行的诀窍：一本提高构建性能的现场指导手册](https://zhuanlan.zhihu.com/p/33322683)
- [浅谈 webpack 性能优化](https://zhuanlan.zhihu.com/p/139498741)
- [带你深度解锁Webpack系列(优化篇)](https://mp.weixin.qq.com/s/Rv1O4oFvj6rVpijUXtfyCA)
- [三十分钟掌握Webpack性能优化](https://juejin.cn/post/6844903651291447309#heading-18)