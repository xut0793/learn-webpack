# webpack 配置项

常规项目中常见的配置项：
```js
// webpack.config.js
module.export = {
  mode: 'production',           // production / development / none 确定打包模式，以此启动对应的默认配置
  context: __dirname,           // 确定 webpack 解析的主目录，绝对路径，entry 和 module.use.loader 中的相对路径会以此确定绝对路径
  entry: 'src/index.js',        // 确定打包入口，定义整个编译过程的起点。可配置类型：string / object / array
  target: 'web',                // 确定打包 bundle 要运行环境，
  output: {},                   // 确定构建输出路径和名称，定义整个编译过程的终点
  module: { rules: [] },        // 确定解析模块的规则，定义各种模块的 loader
  resolve: {},                  // 确定寻找模块的规则，比如如何解析模块路径、模块后缀名、模块的别名等
  plugins: [],                  // 插件配置，对编译完成后的内容进行二度加工
  externals: ['vue'],           // 指出不需要进行打包的模块，在外部自行引入
  devtool: "source-map",        // 确定 source-map 类型
  devServer: {                  // 本地开发服务器配置
    contentBase: '/',           // 内存开发服务的根路径
    compress: true,             // Boolean，是否开启 gzip 压缩
    hot: true,                  // Boolean，是否开启 HMR 功能
    port: '8088',               // 本地开发服务器端口号
    host: 'localhost',
  }
}
```

[[toc]]

## mode 模式

从 `webpack@4.x`开始， webpack 提供了 `mode` 选项，对应选项可以启用对应的默认配置，相当于 babel 中的预设 `preset` 一样。这样当使用 webpack 实现一些简单功能时，就不需要进行完整的配置了。

可用的值：`production / development / none`

- `none`：没有任何默认配置项
- `development`：开发配置
  - 会将 `process.env.NODE_ENV = development`
  - 启用插件： `NamedChunksPlugin, NamedModulesPlugin` 
- `production`: 生产配置
  - 会将 `process.env.NODE_ENV = production`
  - 启用插件： `FlagDependencyUsagePlugin, FlagIncludedChunksPlugin, ModuleConcatenationPlugin, NoEmitOnErrorsPlugin, OccurrenceOrderPlugin, SideEffectsFlagPlugin 和 UglifyJsPlugin` 

> vue-cli-service 中的 --mode 配置，会具体依赖于 NODE_ENV 变量值来决定内部 webpack 配置的 mode类型。
> vue-cli-service serve --mode:development 时，如果环境文件内部没有指明 NODE_ENV 值，则默认 development，此时 webapck 的 mode=development。
> vue-cli-sevice build 命令如果使用 --mode 指定环境文件，则环境文件中要么省略，要么始终应将 NODE_ENV=production，这样内部 webpack 的 mode=production 启用生产构建。

## context 上下文

`context` 值使用绝对路径，默认值是当前目录 `process.cwd()` 或者 `__dirname`。

它确定了 webpack 配置中所有相对路径在解析时确定的绝对路径。通常用于从配置中解析入口文件 `entry` 和 `module.rule.loader` 中的相对路径。

比如下面配置：
```js
module.export = {
  mode: 'none',
  context: '/path/',
  entry: './index.js', // 此时 webpack 解析入口文件的绝对路径是 /path/index.js
}
```

因为 `webpack.config.js`一般都放在项目根目录下，所以 `content` 绝对路径也指定根路径，这样配置中所有相对路径都基于项目根路径，所以 `context` 值一般都不会修改。

## target 目标环境

因为 `javascript` 语言适用的广泛性：
- 浏览器：web 网页应用
- Node.js：服务器应用程序
- electron：桌面应用

所以，在 `webpack` 中可以使用 `target` 属性配置最终输出的 bundle 代码在哪种环境上运行。webpack 会根据配置的环境在构建时作出一些相应的逻辑处理。

```js
module.export = {
  target: 'web', // 默认值，默认为构建运行在浏览器上的 web 应用
  target: 'esX', // 如 es6 或 es2015，编译为指定版本的 ECMAScript，对该版本支持的语法不再作对应的兼容或shim
  target: 'node', // 编译为类 Node.js 环境可用的代码，如 bundle 中使用 Node.js 原生的 require 加载 chunk，而不是像 web 应用中自定义的 _webapck_require_ 函数
  target: 'electron-main', // 编译为 Electron 主进程
  target: 'electron-renderer', // 编译为 Electron 渲染进程
  target: 'browserslist', // webpack 5.x 新增默认值，使用项目内 browserslist 的配置确定最终的 target，如果没有，则为 web
}
```

## entry 入口

`entry`的值是可以是字符串、字符串数组、对象键值对形式： `string | [string] | object {<>:string | [string] }`

`entry`配置的作用：

1. 确认入口模块，即告诉 webpack 从哪里开始进行打包。

   这里需要注意一点是，当传入的是字符串数组时，会将多个资源预先合并到最后一项，在打包时再以数组最后一项作为最终入口。

   ```js
   module.exports = {
     entry: ['common.js', 'index.js']
   }
   // 相当于将 common.js 的所有代码直接合并到数组项最后的 index.js 中，然后再以 index.js 作为入口打包
   // index.js
   console.log('index.js')
   // common.js
   console.log('common.js')

   // 数组项入口打包的效果相当于：将 common.js 代码直接注入到 index.js 中，然后再以 index.js 作为单入口打包
   // index.js
   console.log('common.js')
   console.log('index.js')
   ```

   

2. 定义了导出文件 bundle 的名称：

   - 如果只有一个入口且采用字符串形式，默认 bundle name 是 `main`；

   - 如果是数组形式的多个入口，最终也打包输出一个 bundle，且 name 默认是 `main`;

   - 如果有多个入口文件，采用对象形式，生成多个打包文件可以以入口文件对象的 key 作为 bundle name

```js
module.exports = {
  // 单入口，字符串类型
  entry: './src/index.js',
  output: '[name].js' // 此时输出的制品名称即： main.js

  // 多入口，数组类型
  entry: ['./src/index1.js', '.src/index2.js'],// 相当于在index2.js直接 import 'index1'的效果，然后以index2.js 作为入口
  output: '[name].js', // 此时输出制品名称即：main.js

  // 多入口，对象类型
  entry: {
    app1: './src/index1.js',
    app2: './src/index2.js',
  },
  output: '[name].js' // 此时输出的制品会有两个，app1.js / app2.js
}
```

3. 也可以从 entry 进行分包，提取公共依赖

   默认情况下，每个入口 chunk 保存了全部其用的模块(modules)。使用 `dependOn` 选项你可以与另一个入口 chunk 共享模块。

   ```js
   // webpack 5.x 配置
   module.exports = {
     entry: {
       // 此时 app 这个 chunk 就不会包含 react-vendors 拥有的模块了.
       app: { import: './app.js', dependOn: 'react-vendors' },
       'react-vendors': ['react', 'react-dom', 'prop-types'],
     },
     entry: {
       // dependOn 值也可以为字符串数组，指定多个依赖
       testapp: { import: './wwwroot/component/TestApp.tsx', dependOn: ['reactvendors', 'moment'],},
       moment: { import: 'moment-mini', runtime: 'runtime' },
       reactvendors: { import: ['react', 'react-dom'], runtime: 'runtime' },
     },
   };
   ```

   

## output 出口

`output`配置了webpack 如何进行输出，包括最终打包的制品(bundle)、静态资源(assert)、或者其它使用webpack载入的任何内容。

`output`值为一个对象，有很多属性，但常规项目配置的常见属性包括`filename / path / publicPath / chunkFilename / assetModuleFilename`。

如果打包输出的是npm包，还包括`library / libraryTarget / libraryExport`

### output.path

指定构建后资源输出的位置，要求必须是绝对路径。

在 webpack 4.x 之后，默认为 `dist` 目录，除非需要更改，不然可以忽略。

生成绝对路径可以使用 node 内置的模块 `path.reslove` 和 `__dirname`来得到：
```js
path: path.resolve(__dirname, 'dist')
```

### output.filename

指定打包输出制品的文件名，值为字符串形式。

如果入口 `entry` 值为字符串或数组时，对应只有一个输出文件时，`output.filename`可以写死为一个字符串的值：`filename: 'bundle.js'`。

如果入口 `entry` 值为对象时，会有多个输出，需要为每个不同的输出指定不同的名字。所以 webpack 支持使用一种模板语法，利用变量作为占位符来表示输出文件的名字。
```js
filename: '[name].js'
```
可用的变量占位符包括：
- name: 表示当前 chunk 名称，与入口 entry 值的形式有关
- id：表示当前 chunk 唯一的 id，从 0 开始
- hash: 表示此包打包所有资源生成的 hash 值，默认长度 20 位，也可以通过 `[hash:n]`形式指定 n 位
- chunkhash：表示当前 chunk 内容的 hash，同样默认长度 20 位，也可以通过 `[chunkhash:n]` 形式指定 n 位

这些占位符变量有两个作用：
- 当有多个 chunk 存在需要输出时，对不同的 chunk 进行区分，如 `id / name `。
- 控制客户端缓存。如果 filename 使用了 `hash / chunkhash`，则当模块内容改变，就可以让输出的构建结果文件名改变，从而使用用户在下一次请求资源时返回最新版本的内容而不使用本地缓存的文件。
  - `hash`: 是以所有参与打包构建模块的内容计算生成的 hash 值，所以任何一个模块内容变更，都会导致每一次 hash 值不一样。
  - `chunkhash`：仅以当前相关 chunk 内容变化才会重新计算生成新的值，其它不相关模块 hash 值不会改变。

所以为了控制客户端缓存，日常业务中不管入口 entry 的值是字符串、数组的单入口形式，还是对象的多入口形式，都是将 filename 命名为相关占位符变量
```js
filename: '[name]@[chunkhash:8].js'
```

### output.publicPath

指定公共资源请求的路径。通常与打包结果输出路径的 `path` 容易混淆。

在一个 html 页面中资源文件通常分为两种：
- 直接由 html 页面发起请求的资源，如 script 标签加载js，link 标签加载的 css 
- 另一种是由 js 文件内或 css 文件内发起请求的资源，如异步加载的 js、从 css 代码中请求的图片 `backgrout-image: url('path/xx.png') ` 或字体 `@font-family: `等。

而 `publicPath` 就是用来指定这部分间接资源的请求路径的。它的值有三种形式：

- 相对路径时，以当前 html 页面路径为基准
- 绝对路径 '/' 开头时，以当前 host 为基准
- 协议头或相对协议的形式时，通常用于静态资源部署到 cdn 上相关。

```js
// 假设当前页面的 HTML 地址为：https://example.com/app/index.html
// 则当前 host 地址为：https://exapmle.com
// 当前某个 css 文件的背景图片值 background-image: url(testimg.png)
publicPath: '', // 这里默认值，此时图片实际请求地址是：https://example.com/app/testimg.png
publicPath: 'imgs/', // 此时图片实际请求地址是：https://example.com/app/imgs/testimg.png
publicPath: '../imgs/', // 此时图片实际请求地址是：https://example.com/imgs/testimg.png

publicPath: '/', // 此时图片实际请求地址是：https://example.com/testimg.png
publicPath: '/asserts/', // 此时图片实际请求地址是：https://example.com/asserts/testimg.png

publicPath: 'https://cdn-example.com/', // 此时图片实际请求地址是：https://cdn-example.com/testimg.png
publicPath: '//cdn-example.com/asserts/', // 此时图片实际请求地址是：//cdn-example.com/asserts/testimg.png
```

> 但 webpack-dev-server 的配置项 devServer 中也有一个 publicPath，但两者是有所区别的，devServer.publicPath 用来决定在哪个目录下启用静态资源服务，来访问 webpack 输出的文件。通常与 output.path 配置相同。刚体见 devServer 配置

### output.chunkFilename

用来配置没有指定入口的 chunk 在输出时的文件名称，这类 chunk 通常都是在运行时生成的，通常是异步加载的模块输出的 chunk。如 `import('path/module')`。

`chunkFilename`值的形式与 `filename`一样，使用占位符变量。默认值是 `[id].js`，以 `0` 开始。如果要使用 `[name]` 占位符变量来表示有意义的名字，通常要配合 webpack 特殊的魔法注释(webpack magic comment)标识为`webpackChunkName: name` 来指明当前异步加载的 chunk name，

```js
// webapck.config.js
module.exports = {
  entry: 'index.js',
  output: {
    filename: '[name]@[chunkhash:8].js',
    chunkfilename: '[name].js',
  }
}

// index.js
import(/* webpackChunkName: "example"*/'./example.js').then(res => {console.log(res)})
```

如果是常规的 web 应用项目构建，基本以下出口配置即可。
```js
import path from 'path'
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]@[hash:8].js',
    publicPath: '/asserts/',
    chunkFilename: '[chunkhash:8].js',
  }
}
```
### output.assetModuleFilename

这是 `webpack 5.x` 新增的配置，与最新的打包构建静态资源的配置相关，比如图片、字体等

下面的配置会把项目中的图片都打包到 images 目录下，以原文件名命名覆盖默认以 hash 值命名。

```js
import path from 'path'
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]@[hash:8].js',
    publicPath: '/asserts/',
    chunkFilename: '[name].js',
    assetModuleFilename: 'images/[name][ext][query]', // 默认是 [hash][ext][query]
  },
  module: {
    rules: [
      {
        test: /\.png/,
        type: 'asset/resource' 
        // webpack 5.x 以 type 替换了以前需要使用 use: [‘url-loader']的配置形式，具体见官网
      }
    ]
  },
}
```

但如果是用 webpack 构建一个可以被其它模块导入使用库，或发布到 npm 上的包时，需要再配置 `library` 和 `libraryTarget`

### output.library 和 output.libraryTarget

```js
import path from 'path'
module.exports = {
  target: 'node', // 包的构建目标 node
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]@[hash:8].js',
    publicPath: '/asserts/',
    chunkFilename: '[name].js',

    // 导出库(exported library)的名称
    library: "MyLibrary",               // string,
    // 导出库(exported library)的类型
    libraryTarget: "umd",               // 通用模块定义        
    libraryTarget: "umd2",              // 通用模块定义
    libraryTarget: "commonjs2",         // exported with module.exports
    libraryTarget: "commonjs-module",   // 使用 module.exports 导出
    libraryTarget: "commonjs",          // 作为 exports 的属性导出
    libraryTarget: "amd",               // 使用 AMD 定义方法来定义
    libraryTarget: "this",              // 在 this 上设置属性
    libraryTarget: "var",               // 变量定义于根作用域下
    libraryTarget: "assign",            // 盲分配(blind assignment)
    libraryTarget: "window",            // 在 window 对象上设置属性
    libraryTarget: "global",            // property set to global object
    libraryTarget: "jsonp",             // jsonp wrapper
  }
}
```

## module

`module`配置处理模块的规则，主要配置项是`module.rules`，值是一个数组，数组每一项的 `rule` 描述了如何处理模块，主要有两步：
1. 第一步：通过条件匹配找到对应的模块
1. 第二步：对找到的模块内容应用通过 `use` 配置项来应用对应的 loader 进行处理

```js
module.exports = {
  module: {
    rules: {
      test: /\.js$/, // 正则匹配 js 文件
      use: ['babel-loader'], // 对匹配到的 js 文件应用 babel-loader 进行编译处理
    }
  }
}
```
上面是一个最简版的 `module.rules` 配置。事实上每一步对应的配置项都非常多。

#### 理解 resource / issuer 概念

从模块文件的引用关系来看每一个 `rule` 配置项，可以分为：`resource / issuer`。
```js
// index.js
import bar from './bar.js'
console.log(bar)
```
在 webpack 中，被加载的模块 bar.js 定义为 `resource`，而加载者 index.js 定义为 `issuer`。而 loader 要处理的是被加载的模块 `resource`。所以`module.rules`中通过对 resource 和 issuer 配置一系列正则匹配条件来找到被加载模块，对其施以 loader 作用。
> 找东西当然可以通过不断缩小目标范围 resource 和来源范围 issuer 来更快的找到。

### 匹配条件配置

第一步：通过条件匹配找到对应的模块

```js
module.exports = {
  module: {
    rules: [
      {
        /*
          对加载资源的路径的查询参数（?后的部分）进行匹配
          比如 import Foo from './foo.css?inline' 时 Foo 模块会被下述条件匹配
          {
            resourceQuery: /inline/,
            resource: {
              test: /.css$/,
            }
          }
           在 vue-loader 源码中有实践例子
        */
        resourceQuery: Condition, // 匹配被加载资源的查询参数
        resource: {
          // 条件匹配
          test: Condition,      // 匹配特定条件。一般是提供一个正则表达式或正则表达式的数组
          include: Condition,   // 匹配特定条件。一般是提供一个正则表达式或正则表达式的数组
          exclude: Condition,   // 排除特定条件。一般是提供一个字符串或字符串数组，但这不是强制的。
          and: [Condition],     // 必须匹配数组中的所有条件
          or: [Condition],      // 匹配数组中任何一个条件即可
          not: [Condition],     // 必须排除这个条件
        },
        issuer: {
          // 条件匹配，具体同上
          test: Condition,
          include: Condition,
          exclude: Condition,
          and: [Condition],
          or: [Condition],
          not: [Condition],
        }
      }
    ]
  }
}
```
上述各条件配置项中的 `Condition` 条件的格式可以是下面几种之一：
- 字符串：匹配输入必须以提供的字符串开始。目录绝对路径或文件绝对路径。
- 正则表达式：RegExp，最常用的方式。
- 函数：调用输入的函数，必须返回一个真值(truthy value)以匹配。
- 数组：至少匹配其中一个条件。
- 对象：匹配所有属性。每个属性都有一个定义行为。


其中 `resource` 属性的配置项`test / include / exclude`都可以直接简写到同级属性中。

但如果使用了 `resource` 属性去配置，那就不能在同级上使用简写属性`test / include / exclude`，反之一样。
```patch
module.exports = {
  module: {
    rules: [
      {
-        resourceQuery: Condition,
-        resource: {
-          test: Condition,
-          include: Condition,
-          exclude: Condition,
-          and: [Condition],
-          or: [Condition],
-          not: [Condition],
-        },

+        // 等同于
+        resourceQuery: Condition,
+        test: Condition,
+        include: Condition,
+        exclude: Condition,
      }
    ]
  }
}
```

### 应用规则配置

第二步：对找到的模块内容应用通过 `use` 配置项来应用对应的 loader 进行处理

`use`配置项的值是数组，数组中每一项可以是表示 loader 名称的字符串，也可以带 loader 配置参数 options 的对象形式。

```js
use: ['style-loader', 'css-loader', 'less-loader'], // 字符串表示
use: [
  'style-loader',
  {// 也可以是一个对象形式，指定 loader 和可选的 loader.options
    loader: "css-loader",
    options: {
      modules: true
    },
  },
  {
    loader: 'less-loader',
    options: {
      sourcemap: true,
    }
  }
]
```

`use`数组项中配置多个 loader 时，执行顺序默认是从右到左执行的，也可以通过 `enforce` 配置将其所在的 loader 强制放到最前或最后执行。`enforce：'pre' / 'post'`

```js
rules: [
  {
    test: /\.js$/,
    use: [
      {
        loader: 'eslint-loader',
        enforce: 'pre',
      },
      'babel-loader',
    ]
  }
]
```
按默认执行顺序是 `babel-loader => eslint-loader`，但在 `eslint-loader` 中配置了 `enfore: 'pre'`，即代表在所有正常 loader 之前执行，这样可以保证其检测的代码不是被其它 loader 更改过的。

事实上，实际配置时也可以完全不用配置 `enforce`，只要保证 loader 顺序是正常即可。

### noParse / parser

`noParse` 配置项可以让 webpack 忽略对部分没采用模块化规范的文件进行递归解析和处理，这样可以加速打包构建速度。原因是像 `jQuery / ChartJS`这类庞大而又没有采用模块化的规范书写的库让 webpack 去解析即耗时又没有意义。此时可以用 `noParse` 配置项来排除掉。

```js
module.exports = {
  module: {
    noParse: /jquery/, // 正则
    noParse: (content) => {return /jquery/.test(content)}, // 函数返回 Boolean
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
      },
    ]
  }
}
```
但现在普遍的前端项目工程引用的 npm 包都采用 `CommonJS / ES moudle`模块规范，所以`noParse`配置项基本无用，可以忽略。

`parser`配置项可以更细粒度地配置webpack解析哪种模块规范，忽略哪种模块规范。因为webpack模块打包方案默认支持几乎所有模块规范语法`CommonJS / AMD / CMD / UMD / SystemJS / ESM`，所以可以通过 `parser`选项配置只支持具体哪一种规范。

```js
module.exports = {
  module: {
    noParse: /jquery/,
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        parser: {
          amd: false,                 // 禁用 AMD
          commonjs: false,            // 禁用 CommonJS 模块规范
          harmony: false,             // 禁用 ES Module 模块规范的 import / export 语法
          system: false,              // 禁用 SystemJS
          browserify: false,          // 禁用 browserify
          requireJs: false,           // 禁用 requirejs
          requireInclude: false,      // 禁用 require.include
          requireEnsuse: false,       // 禁用 webpack 自身实现的 require.ensure
          requireContext: false,      // 禁用 webpack 自身实现的 require.context
        }
      }
    ]
  }
}
```

区别：
- noParse 配置项只控制哪些文件不被解析
- parser 配置项可以精确到语法层面，控制哪些模块规范的语法不被解析

`noParse / parser` 可以都算作第一步中条件匹配的配置项。只有 `use` 配置是匹配结果应用的配置项。

```js
module.exports = {
  module: {
    noParse: Condition, // 此处 Condition 只能是正则 RegExp 或正则数组项 [RegExp] 或函数 function 返回 Boolean 值
    rules: [
      {
        resourceQuery: Condition,
        resource: {
          // 条件匹配
          test: Condition,
          include: Condition,
          exclude: Condition,
          and: [Condition],
          or: [Condition],
          not: [Condition],
        },
        issuer: {
          // 条件匹配
          test: Condition,
          include: Condition,
          exclude: Condition,
          and: [Condition],
          or: [Condition],
          not: [Condition],
        },
        parser: {
          system: false,              // 禁用 SystemJS
          browserify: false,          // 禁用 browserify
          requireJs: false,           // 禁用 requirejs
        },
        // 应用规则
        use: [
          'style-loader', // 可以是一个 loader 的字符串
          {// 也可以是一个对象形式，指定 loader 和可选的 loader.options
            loader: "css-loader",
            options: {
              modules: true
            },
            enfore: 'pre', // 指定该 loader 执行的顺序 pre 最前 post 最后
          }
        ],
      }
    ]
  }
}
```

## resolve

`resolve`选项能配置 webpack 查找模块的规则。webpack 提供了默认的模块解析规则，但在实际项目中也可以修改一些解析的细节，以提高模块打包效率。

```js
module.exports = {
  // 常用的配置属性
  resolve: {
    alias: Object,
    extensions: [".js", ".json"], // 默认值
    enforceExtension: false,
    enforceModuleExtension: false,
    modules: ["node_modules"],
    descriptionFiles: ['package.json'],
    mainFiles: ["index"],
    mainFields: ["browser", "module", "main"], // target: web 时默认配置，当 target:node 时为 ["module", "main"]
  }
}
```

### alias

通过创建一个别名将原导入路径映射成一个新的导入路径，来确保模块引入变得更简单。

当在大型前端项目中，文件路径嵌套比较深时，进行文件引用的路径可能会比较烦索。

`import example from '../../../../components/example.vue'`

此时就可以定义一个路径别名来简化路径写法：`import example from '@components/example.vue'`
```js
resolve: {
  alias: {
    '@components': './src/components'
  }
}
```
以上别名配置的含义是，将导入语句里的 `@components` 替换成 `.src/components`。

但有时定义的别名关键字会命中太多导入语句，此时可以通过在别名尾部添加 `$` 来缩小命中范围，只匹配以该别名结尾的导入语句。
```js
resolve: {
  alias: {
    'vue$': '/node_modules/vue.min.js', // 命中 import vue from 'vue'
  }
}
```

### extensions / enforceExtension / enforceModuleExtension

在导入语句没有带文件后缀时， webpack 会自动带上后缀去尝试访问文件是否存在。`extensions` 配置在尝试过程中用到的后缀列表。

默认是 `extensions: ['.js', '.json']`，也就是说当遇到 `require('./example')`时，webpack会选寻找 `.example.js`文件是否存在，如果不存在时，再尝试寻找 `example.json`文件，如果还是找不到就报错。

在 vue 工程项目中，我们想让 webpack 优先使用 `.vue` 文件后缀匹配，则可以配置为：
```js
resolve: {
  alias: {
    '@components': './src/components'
  },
  extensions: ['.vue', '.js', '.json'],
}
```

webpack 默认模块导入时可以不带后缀名，并先后以 `.js / .json` 尝试加载导入。但如果我们要求项目中所有模块导入语句都必须带上文件后缀名时，则可以设置 `enforceExtension: true`。此时 `import example from './example'` 语句将报错，`import example from './example.vue'`将正常。

在开启 `enforceExtension: true` 时，因为安装的第三方依赖模块中大多数文件导入语句都没有带文件的后缀名，我们希望不将影响扩散到第三方模块的中，则可以配合设置 `enforceModuleExtension: false`。（默认值即为 false）。

`enforceExtension`和`enforceModuleExtension`作用类似，但是影响范围不同，`enforceModuleExtension`只对 `node_modules`下的模块文件生效。

```js
resolve: {
  alias: {
    '@components': './src/components'
  },
  // extensions: ['.vue', '.js', '.json'],
  enforceExtension: true,
  enforceModuleExtension: false,
}
```
> enforceModuleExtension 在 webpack 5.x 中已废除

### modules

`resolve.modules` 配置 webpack 去哪里查找依赖的第三方模块，默认只会去 `node_modules` 目录下寻找。

但有时项目中会有一些目录下的模块会被其它文件大量依赖和导入，这样针对不同文件都要重新计算一遍被导入模块的相对路径，这个路径会很长，就像`import example from '../../../../components/example.vue'`，即使使用`reslove.alias`定义了别名，也可能依然要计算相对路径。

此时，可以利用 `resovle.modules`配置项优化。假如被大量导入的模块目录是在 `./src/components`目录下，则可以如下设置：
```js
resovle: {
  modules: [path.resolve(__dirname, "src/components"), "node_modules"],
```
此时 `./src/components` 目录优先于 `node_modules/` 搜索。

### descriptionFiles

解析第三方模块时，指定模块项目的描述文件，基本不作修改，采用主流约定的默认配置：`descriptionFiles: ['package.json']`

### mainFiles

解析到目录时要使用的文件名，基本不作修改，采用主流约定的默认配置： `mainFiles: ["index"]`。

当 `import example from './path/dir` 时，判断 dir 为目录时，则优先匹配目录下的 index 文件，即 `./path/dir/index`。

### mainFields

现代第三方模块会针对不同的环境提供不同模块规范的代码。例如分别提供采用 ES module 规范的代码和 CommonJS 规范的代码。在其 `package.json`文件中指明：
```json
// package.json
"main": "lib/index.js",
"module": "es/index.js",
```
webpack 会根据 `mainFields`配置去决定优先采用哪份代码，即使用最新找到文件的配置。此配置项基本不作修改，采用默认配置：
```js
resolve: {
  mainFields: ["browser", "module", "main"], // 针对构建目录 target 是 web 时
  mainFields: ["module", "main"], // 其它构建目标，如 node 
}
```

所以对 `resolve` 配置最常用的也就是 `alias / extensions`两项，其它基本保持默认值即可。

```js
module.exports = {
  // 常用的配置属性
  resolve: {
    alias: Object,
    extensions: [".js", ".json"], // 默认值
  }
}
```

## plugins

`plugin` 用于扩展 Webpack 功能，各种各样的 `plugin` 几乎让 Webpack 可以做任何构建相关的事情。

`plugins` 配置项接受一个数组，数组里每一项都是一个要使用的 Plugin 的实例，如果实例化 Plugin 需要的参数通过构造函数传入。

```js
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
module.exports = {
  plugins: [
    new CommonsChunkPlugin({
      name: 'common',
      chunks: ['a', 'b']
    }),
  ]
};
```

使用 Plugin 的难点不是如何在 webpack 中接入 plugin，而是在于 pugin 本身提供的配置项，需要查阅 plugin 自身的文档进行配置。

## externals

`externals` 配置实现了不将某些 import 的包(package)打包到 bundle 中，而是在运行时(runtime)由运行环境提供这些扩展依赖(external dependencies)。

比如我们在web 项目中计划通过 cdn 来引入 `jQuery`:
```html
<script src="https://code.jquery.com/jquery-3.1.0.js" crossorigin="anonymous"></script>
```
这时业务代码有导入 `jQuery`来使用时，就希望打包构建时不要包括 jQuery。
```js
import $ from 'jquery';
$('.my-element').animate(/* ... */);
```
引时，可以在配置文件中这样配置：
```js
module.exports = {
  //...
  externals: {
    jquery: 'jQuery',
  },
};
```

externals 可用的配置类型的值，除了 `string`，还有 `[string]`和`object`形式：
```js
module.exports = {
  //...
  externals: [
    {
      // 字符串
      react: 'react',
      'fs-extra': 'commonjs2 fs-extra', // 构建时不会打包 fs-extra 模块，但会把 import fs from 'fs-extra' 导入语法改成 const fs = require('fs-extra');

      // 字符串数组, ./math 是父模块，而 bundle 只引用 subtract 变量下的子集。该例子会编译成 require('./math').subtract;
      subtract: ['./math', 'subtract'],
      // 对象，仅允许用于构建 npm 类库代码时， output.libraryTarget: 'umd' 这类的配置情况下抽离依赖的配置
      lodash: {
        commonjs: 'lodash',
        amd: 'lodash',
        root: '_', // indicates global variable
      },
    },
    // 正则表达式
    /^(jquery|\$)$/i, // 所有名为 jQuery 的依赖（忽略大小写），或者 $，都会被排除构建

    /**
     * 函数
     * @params {object} ctx 包含文件详情的对象
     *                  ctx.context (string): 包含引用的文件目录。
     *                  ctc.request (string): 被请求引入的路径。
     *                  ctx.contextInfo (string): 包含 issuer 的信息
     *                  ctx.getResolve 5.15.0+: 获取当前解析器选项的解析函数。
     * @params {function} callback (function (err, result, type)): 用于指明模块如何被外部化的回调函数
    */
    function ({ context, request }, callback) {
      if (/^yourregex$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ],
};
W
```

## performance 性能检查

配置在构建时如何输出性能相关的提示信息。比如，如果一个构建后的 bundle 大小超过 250kb，webpack 会对此输出一个警告或错误来通知你。

```js
module.export = {
  performance: {
    hints: false, // 关闭性能检查
    hints: 'warning', // 有性能问题时输出警告，不中断构建，默认设置，在开发环境，我们推荐这样
    hints: 'error', // 有性能问题时输出错误，会中断构建，在生产环境构建时，推荐使用有助于防止把体积巨大的 bundle 部署到生产环境，从而影响网页的性能。
    maxEntrypointSize: 400000，// 单位 bytes, 设置针对入口文件为起点构建的 bundle 的最大值，这是控制应用运行时初始加载文件的大小。
    maxAssetSize: 100000, // 设置用 webpack 构建其它应用依赖资源(asset)生成 bundle 文件最大值。
    // 筛选过滤出需要 webpack 用于性能检查的文件
    // 下面这个是默认函数，即除 .map 类型文件不参与性能检查外，其它构建文件都需要进行性能检查
    assetFilter: function assetFilter(assetFilename) {
      return !/\.map$/.test(assetFilename);
    }
    // 也可以定义函数,下面函数表明只对 .js 文件进行性能检查，即当某个 .js 文件的构建结果超出设置时给出提示。
    assetFilter: function (assetFilename) {
      return assetFilename.endsWith('.js');
    },
  }
}
```
## stats 统计信息

`stats` 选项让你更精确地控制webpack 构建过程中哪些信息进行显示。

`stats` 可配置是否显示的信息项非常多，没必要一个个去开启或关闭，所以 webpack 提供了几种预设值，一键配置常用的显示规范。

```js
module.exports = {
  //...
  stats: 'none', // 没有任何编译信息输出
  stats: 'errors-only', // 只在发生错误时输出相关信息
  stats: 'errors-warnings', // 只在发生错误或有新的编译时输出
  stats: 'minimal', // 只在发生错误或新的编译开始时输出
  stats: 'normal', // 标准输出
  stats: 'verbose', // 全部输出
  stats: 'detailed', // 全部输出除了 chunkModules 和 chunkRootModules
  stats: 'summary', // 只输出部分统计信息，如webpack 版本，以及警告数和错误数。
};
```

如果使用了某种预设，但又想关闭预设中某些属性，或者添加额外属性，可以转为对象形式设置：

```js
module.exports = {
  //..
  stats: {
    preset: 'minimal',
    moduleTrace: true,
    errorDetails: true,
  },
};
```

`stats.performance: true | false`，可以控制当依赖资源文件构建结果大小超过 `performance.maxAssetSize`配置值时，是否展示性能提示，默认 `true` 。

> 对于要控制 webpack-dev-server 时信息输出，这个属性要放在 devServer 配置对象中设置.
> 在 Node.js 中使用 webapck API 配置时，此选项无效。如果你需要，则需要将统计选项传递给 stats.toString() 和 stats.toJson() 调用。

## optimization

从 webpack 4.x 开始，会根据你选择的 `mode` 来执行不同的优化，具体见上面， 不过所有的优化还是可以通过`optimization`手动配置和重写。

```js
module.exports = {
  // 常见配置
  optimization: {
    minimize: true, // 此时 webpack 使用默认 TerserPlugin 插件压缩 bundle
    minimizer: [new CssMinimizer(), '...'], 
    // 如果将上面 minimize 设为 false时，则允许在 minimizer 中传入一个或多个其它压缩器，或定制的选项对象的 TerserPlugin 插件。 '...' 表示默认值，即 TerserPlugin 插件
    splitChunks: {}，// 配置默认的 SplitChunksPlugin 插件可用选项值覆盖默认配置。
    runtimeChunk: false, // object string boolean，设置 webapck 构建中插入运行时代码的方式
    // 省略其它
  },
};
```
这里的配置主要关注两块功能代码压缩 `minimize 、 minimizer` 配置和代码切割 `splitChunk` 的配置。

### 代码压缩

压缩 js 文件大多数使用的工具有两个，一个是 `UglifyJS`，被 webpack 3.x 集成，另一个是 `terser`，被 webapck 4.x 集成。由于后者支持 ESnext 代码的压缩，所以从 webpack 4.x 开始默认使用 terser 的插件 `terser-webpack-plugin`。

在 webpack 4.x 以后要开启 js 代码压缩，可以直接设置 `optimization.minimize: true`即可。`mode: 'production`时默认开启。

如果需要对`terser-webpack-plugin`插件的压缩选项进行自定义配置，可以`optimization.minimizer`进行设置
```js
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  optimization: {
    minimizer: [
      // minimize:true 时的启用 terser-webpack-plugin 插件，该插件可用的配置项及默认值
      new TerserPlugin({
        test: /\.m?js(\?.*)?$/i,
        include: undefined, // string, regexp
        exclude: undefined, // string, regexp
        cache: false, // 是否开启缓存，默认缓存目录 node_modules/.cache/terser-webpack-plugin，传入字符串可以修改路径
        parallel: false, // 开启多进程进行压缩，传入数字可指定进程数
        sourceMap: false, // 是否生成 sourceMap, 需要同时存在 devtool 配置。
        terserOptions: { // terser 自身配置项，具体参考https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        },
      }),
    ],
  },
};
```

可以看到 `optimization.minimizer` 压缩只针对 js 文件，如果需要 css 文件进行压缩，需要使用 `mini-css-extract-plugin`插件提取出来，再配合使用 `optimize-css-assets-webpack-plugin`插件进行压缩，这个压缩插件内部使用的压缩器是 `cssnano`。

```js
module.export = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../',
            },
          },
          'css-loader',
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
  ],
  optimization: {
    minimizer: [
      new OptimizeCssAssetsPlugin({
        assetNameExp: /\.optimize\.css$/g, // 匹配文件，只压缩匹配到的文件
        cssProcessor: require('cssnano'), // 自定义压缩器，默认也是 cssnano
        cssProcessorOptions: { // 压缩器的配置
          discardComments: { removeAll: true,},
        },
        canPrint: true, // 是否显示 log
      }),
      '...', // 对于其它，默认使用 terserPlugin 插件
    ]
  }
}
```

### splitChunks 代码分片

webpack 4.x 为了改进 webpack 3.x 使用 `CommonsChunkPlugin` 插件而重新设计和实现了代码分片的功能，并通过`optimization.splitChunks`进行配置。

```js
module.export = {
  optimization: {
    // splitChunks 默认配置
    splitChunks: {
      // 1. 匹配模式
      chunks: 'async', // async: 只提取异步 chunk; initial: 包含入口 chunk； all：两种模式同时开启

      // 2. 命名：name：true 时可以根据 cacheGroups 和作用范围自动生成提取 chunk 名字，并atuomaticNameDelimiter 配置的符号连接。
      // 比如：vendors~a~b~c.js 意思是 cacheGroups 为 verdors，并且该 chunk 是由 a、b、c 三个文件打包而成。
      name: true,
      atuomaticNameDelimiter: '~',

      // 3. 匹配条件
      minSize: { // 生成块的最小大小（以字节为单位）
        javascript: 30000,
        style: 50000,
      },
      maxSize: 0,
      minChunks: 1, // 分割之前，模块必须在块之间共享的最短次数
      maxAsyncRequests: 5, // 按需加载时并行请求的最大数量
      maxInitalRequests: 3, // 首次加载时入口点的最大并行请求数

      // 4。 提取分片 chunk 的规则：默认有两以下两种，如果一个模块同时命中多个规则，根据 priority 确定优先级。
      //  vendros：提取所有 node_modules 中符合条件的模块
      // default: 提取被多次引用的模块。
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        }
      }
    }
  }
}
```

从上面 splitChunks 默认配置，可以得出默认情形下代码分片提取的条件

1. 被多个模块引用或引用自 node_modules 目录，即 cacheGroup 配置。
1. 提取后的 js chunk 大于 30kb（压缩和 gzip 之前），css chunk 大于 50kb。如果提取太小的 chunk 为独立文件带来的收益不大。
1. 在按需加载过程中，并行请求的资源最大值小于等于 5。按需加载的实现是通过动态插入 script 标签的方式实现的，一般我们不希望同时加载过多资源，因为每一请求都要花费建立连接和释放连接的成本，所以控制异步加载时机在并行请求数不多的进修生效。
1. 首次加载时，并行请求资源数最大值小于等于3。和上一条类似，只不过在页面首次加载时往往对性能要求更高，所以这里默认阈值更低。


## devtool

用于配置 webpack 构建打包时生成 sourceMap 的类型。
```js
module.exports = {
  devtool: 'source-map',
}
```
如果要对 `scss/less/stylus` 文件构建成 css 文件时开启 sourceMap 功能，则需要在对应 loader 的属项中开启。
```js
module.exports = {
  devtool: 'source-map', // js 文件开启 sourceMap
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { sourceMap: true, },
          },
          {
            loader: 'less-loader',
            options: { sourceMap: true, },
          },
        ]
      }
    ]
  }
}
```

webpack 支持多种 source map 形式， `source-map` 是最完整的，但生成完整的 sourceMap 会延长整体构建时间，所以为了加快打包速度，会选择一些简略版本的 sourceMap。

devtool 可配置的 source map 类型值基本由以下部分组件：
- source-map：核心部分，生成.map 文件，`webpack://` 文件夹保存着 .map 文件
- evel：rebuild， 提升 rebuild 构建速度，`webpack-internals://` 文件夹来保存一份里面是eval形式的模块文件
- inline: dataURI, 正常 sourceMap 会创建一个 .map 文件， inline 的含义就是不产生独立的 .map 文件，而把 source-map 的内容以 dataURI的方式追加到 bundle 件末尾。
- cheap：lines-only，正常.map 文件会映射代码行数和列数位置信息，cheap 只关注行，不关注列，以此提高速度
- module：loader，映射到 loader 处理前源文件，如果没有，只会映射到 loader 处理后的文件。需要在 loader 选项中开启对应 sourcemap 配置，如上 css

比如在开发环境中，使用 `cheap-module-eval-source-map`，它是属于打包速度和源码信息还原程度较为折中的一种。

在生产环境中，考虑到安全性问题，通常会有不同的方案，常用的配置是 `nosources-source-map`。

具体关于 sourceMap 在不同环境中的选择，可以网上搜索。

## devServer

webpack 在开发环境中，使用 `webpack-dev-server` 来开启一个本地开发服务器。通过 `devServer` 属性可以配置 `webpack-dev-server`的行为。

```js
module.exports = {
  // 常用的基本配置属性
  devServer: {
    contentBase: path.join(__dirname, 'dist'), 
    // 指定 dev server http 服务器的本地文件目录. devServer 服务器通过 HTTP 服务暴露的文件可以分为两类：1. 本地文件；2. webpack 构建出 bundle 文件。contentBase 只能用来配置暴露本地文件的路径。
    publicPath: '/assets/', 
    // 始终以正斜杠开头和结尾，指定开发服务器启动后，浏览器加载静态资源的路径，默认是按如下路径查找： http://[devServer.host]:[devServer.port]/[output.publicPath]/[output.filename] 进行访问。
    index: 'index.html', 		// 设置 web 应用入口文件
    hot: true, 							// 配置是否启用热模块替换功能
    open: true， 						// 用于 devServer 首次启动时第一次构建完成后是否打开系统默认浏览器，也可以传入浏览器名称打开指定浏览器，如 'Chrome'，浏览器名称具体视操作系统不同名称不同
    openPage: '/path/page', // 在 open 生效时，配置打开指定网页，默认首页
    clientLogLevel：'error', // 配置客户端的日志等级，即在浏览器开发者工具控制台可以看到的日志内容。 none:没有任何输出；error：错误输出；warning: 警告输出；info：输出所有。
    host: 'localhost', 			// 指定本地服务器主机
    port: 8080, 						// 指定端口号
    header: {}, 						// 配置 http 响应中注入自定义响应头字段
    compress: true, 				// 请求服务器返回的静态文件是否启用 Gzip 压缩
    historyApiFallback: true, // 使用 HTML5 History API 时, 所有的 404 请求都会响应 index.html 的内容
    https: false, 						// 本地服务器默认使用 http，如果要开启 https 则设为true，devServer 会自动生成一份HTTPS 证书，也可以配置一个对象使用本地 HTTPS 证书。
    allowedHosts: [], 				// 配置一个白名单列表，本地服务请求的 host 在列表内才能正常返回。
    proxy: {}, 								// 内部引用  http-proxy-middleware 包，具体配置见该包配置
    // 提供两个钩子，用于访问内部 Express 应用程序对象，并向其中添加自己的自定义中间件
    before: function (app, server, compiler) {},
    after: function (app, server, compiler) {},

  },
};
```



