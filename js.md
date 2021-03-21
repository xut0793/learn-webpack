# js 处理

- 基础依赖打包
- 异步代码提取实现懒加载
- 公共代码提取：
  - 类型：依赖代码、运行时代码、业务公共代码
  - 方式：入口处拆分、splitChunks 拆分
- tree-shaking
- 压缩
- bable-loader

## 原生使用 script

一个简单点击按钮显示随机数的功能，使用原始的 `<script></script>` 标签插入 HTML 中使用：

```js
/**
 * 生成指定位数的随机整数
 */
const genRandomNumber = (n = 1) => {
  return Math.round(Math.random() * Math.pow(10, n))
}

console.log('used', genRandomNumber())

/**
 * 生成按钮元素
 */
const genElement = () => {
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  }

  return eleBtn
}

document.body.appendChild(genElement())
```
```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>javascript</title>
</head>
<body>
  <script src="index.js"></script>
</body>
</html>
```
遵循模块化开发，我们可以把生成随机数的代码抽离到独立的工具方法的文件 `utils.js`，此时我们就需要在 html 中引入两个 `script` 文件。

```js
// utils.js
/**
 * 生成指定位数的随机整数
 */
const genRandomNumber(n = 1) => {
  return Math.round(Math.random() * Math.pow(10, n))
}
```
```js
// index.js
/**
 * 生成按钮元素
 */
console.log('used', genRandomNumber())

const genElement = () => {
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  }

  return eleBtn
}

document.body.appendChild(genElement())
```
```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>javascript</title>
</head>
<body>
  <!-- utils.js 必须在 index.js 前面引入，因为 genRandomNumber 定义为 const 变量，存在暂时性死区问题，必须要定义之后才能引用-->
  <script src="utils.js"></script>
  <script src="index.js"></script>
  <!-- <script src="utils.js"></script> -->

</body>
</html>
```

此时，在 HTML 中引入两个有依赖关系的 js 文件时问题：
- 除了 js 文件定义的变量都变成全局函数内，（虽然可以用 IIFE 解决，或者使用 ES Module）
- 更重要的问题是，还需要注意文件引入的顺序问题，不然会导致某些变量使用报错。
- 多个依赖就需要写入多个 `script` 标签

所以，需要使用打包工具把有依赖关系的文件合并成一个可以直接使用的独立文件，让工具在打包的过程中自动处理了模块间的引用关系。

## 打包处理

要把单独的文件变成可用的模块，就需要约定一种可用于模块组装的规范，称之为**模块规范**，就是在单个模块文件中增加样板代码：导入和导出的语句。就好比拼装积木上统一的凹凸点。目前 web 标准模块规范是 **ES Module**，通用于浏览器端和node端。

基本语法：导出 `export default` 或者 `export`；导入`import module from 'path/to'`

```js
// utils.js
export default const genRandomNumber = (n = 1) => {
  return Math.round(Math.random() * Math.pow(10, n))
}
```
```js
// index.js
import genRandomNumber from './utils.js'

console.log('genRandomNumber', genRandomNumber())

/**
 * 生成按钮元素
 */
const genElement = () => {
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  }

  return eleBtn
}

document.body.appendChild(genElement())
```
配置文件：
```js
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-base'),
    filename: 'bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin()
  ]
}
```
此时，HTML 只需要引入 `bundle.js` 即可。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Webpack App</title>
    <script defer src="bundle.js"></script>
  </head>
  <body>
  </body>
</html>
```

## 动态导入实现懒加载

因为 `utils.js` 中的代码，只有当页面点击了按钮时才需要用到其内部函数，所以理想情况下，我们希望在首屏加载时不加载 `utils.js` 代码，当点击按钮时才去加载代码实现功能。

在 `webpack` 中，要实现这样的需求（称为懒加载），需要使用动态导入。

`webpack` 提供了两个方式来实现动态导入：

- `require.ensure()`：这是 `webpack` 早期的实现，现在基本不用了；
- `import()`： 推荐使用符合 `ECMAScript` 提案的 `import()` 语法来实现动态导入。

`webpack` 内部对 `import()` 导入的模块的应用规则是：

- 以 `import('path/to/file')` 导入的模块为新的入口文件打包成一个单独的 chunk，称为**异步 chunk(async chunk) **以区别于在HTML上直接引用的**入口 chunk(initial chunk)**。
- 运行时，当代码执行到 `import()` 语句时才去加载对应的 async chunk。（实现原理简单理解是通过动态创建 script 元素使用 jsonp 方式加载 chunk，然后删除临时的 script 元素)
- `import()`返回一个 `Promise` 对象，当加载成功时可以在 `then` 方法中获取实际模块代码。
> `webpack` 中使用的 `import()` ，并不是使用浏览器或node提供的符合ES规范的原生 `import()`，因为要兼容 `ES Module` 规范和 `CommonJS` 规范，所以自己按照 ES module 规范标准实现了 `import()` API。
> 所以，如果 `import('path/to/commonjs') `导入的是一个 `CommonJS` 规范的模块的默认导出时，在 `then` 中回调函数中获取模块内容需要通过`.default`
> `import('/path/to/esm').then(res => console.log(res))`
> `import('/path/to/commonjs).then(res => console.log(res.default))`

```patch
- import genRandomNumber from './utils.js'
const genElement = () => {
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
-    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
+   import('./utils.js').then(res => {
+       console.log('import res', res)
+      eleBtn.textContent = `Click me to generate random number: ${res.genRandomNumber(2)}`
+    }) 
  }

  return eleBtn
}
document.body.appendChild(genElement())
```
更改配置文件
```patch
output: {
-   path: path.resolve(__dirname, 'bundle-base'),
-   filename: 'bundle.js'
+   path: path.resolve(__dirname, 'bundle-import'),
+   filename: '[name].bundle-esm.js',
},
```
此时打包结果可以看到：
- 打包结果除了入口文件 `main.bundle-esm.js`，还多出一个 `1.bundle-esm.js`
- 打开浏览器 `network` 面板，刷新 `index.html` 页面首次只加载了 `main.bundle-esm.js`，如果点击按钮，才加载了 `1.bundle-esm.js`，实现了按需加载。

### `import()` 导入 `CommonJS` 与 `ESM` 模块时，取值的不同

再来看下，如果把 `utils.js` 使用 `CommonJS` 规范导出时，`import()` 返回结果，查看控制台 `console.log` 的结果。

```patch
# utils.js
-  export default const genRandomNumber = (n = 1) => {
+  module.exports = genRandomNumber = (n = 1) => {
    return Math.round(Math.random() * Math.pow(10, n))
}

# index.js
import('./utils.js').then(res => {
  console.log('import res', res)
-  eleBtn.textContent = `Click me to generate random number: ${res.genRandomNumber(2)}`
+  eleBtn.textContent = `Click me to generate random number: ${res.default.genRandomNumber(2)}`
})

# 配置文件修改
output: {
   path: path.resolve(__dirname, 'bundle-import'),
-   filename: '[name].bundle-esm.js',
+   filename: '[name].bundle-cjs.js',
},
```

但是如果将 `utils.js` 不使用默认导出，使用 `exports`导出，则与 `ESM` 使用无异。

```patch
- module.exports = genRandomNumber = (n = 1) => { // 需要通过 res.default.genRandomNumber 获取
+ exports.genRandomNumber = (n = 1) => { // import().then(res => res.genRandomNumber) 可以正常获取
    return Math.round(Math.random() * Math.pow(10, n))
}
```

### 懒加载 bundle 文件名称

`webpack` 对通过 `import()` 导入的模块输出单独的文件，默认使用 `[id]` 的变量占位符。我们也可以自定义按需加载产生的 chunk 名称。

```patch
# 配置文件
output: {
   path: path.resolve(__dirname, 'bundle-import'),
   filename: '[name].bundle.js', // 这里的name 根据 entry 配置获取
+  chunkFilename: '[name].bundle.js', // 这里的 name 根据 webpackChunkName 的魔法注释读取
},

# index.js
- import('./utils.js').then(res => {
+ import(/* webpackChunkName: 'utils' */'./utils.js').then(res => {
  console.log('import res', res)
  eleBtn.textContent = `Click me to generate random number: ${res.genRandomNumber(2)}`
})
```
此时 `[name]` 的取值需要配合 `webpack` 的魔法注释(`webpack magic comment`)，即如上 `import()` 中写法。

此时，打包输出的结果就是 `utils.bundle.js`。

`chunkFilename` 命名的变量占位符同 `filename` 一样使用，也可以使用 `hash / chunkhash` 等


## 代码提取

`webpack `作为打包工具基本的思想是将各个分散的有依赖关系的模块打包成一个文件，比如对 CSS 的处理，最终得到一个独立的 `CSS` 文件通过 link 标签嵌入使用。

但在使用 `webpack` 打包 `JS` 代码的过程中，更多考虑的是相反思维方向：是如何避免将工程内所有的JS代码打包构建成一个体积彭大 `bundle`，让 `HTML`引用，这样会造成网络请求时间过长，页面长时间无响应的情况。

我们需要在将各个分散的模块进行打包，又要避免单个 bundle 体积过大之间取得平衡，就是要利用 webpack 进行合理的代码提出，控制输出一个或多个 bundle。

那具体如何提取，提取哪些代码呢？我们先要熟悉在一个前端项目中，会包括哪些类型的代码：



现代前端项目中，在开发阶段会产生三类代码：

1. 模板代码，即脚手架初始化项目后的代码，如 `vue-cli / create-react-app`
2. 依赖代码，即使用 `npm install package` 安装的第三方 `npm` 依赖代码
3. 预处理代码，即实际的业务源代码，这些代码可能需要经过编译，如需要 `babel` `less` 进行处理

在生产阶段，最终的上线的代码中同样会有二类代码：
1. 运行时代码，包括框架或工具注入的必要的运行时代码。如 `vue` 框架会注入运行时代码、`webpack` 打包构建中会注入运行时代码(`__webpack_require__`等)、`babel` 转译中会注入向下兼容版本的运行时代码，也经常叫作**运行时**
1. 源代码：经过编译的，浏览器实际可用的业务代码

如上面所说，在项目实际运行中，不管是开发环境，还是生产环境，我们都不应该把所有代码都打包成一个 `bundle.js`插入到项目 HTML，这样会导致整个 bundle 体积很大，影响页面加载速度。

所以在控制 bundle 大小和 http 请求数之间找到一个平衡，所以代码提取的一般原则：
1. 会把依赖代码构建成一个或几个`vender bundle`，如 `vue / vue-router / vuex` 构建成独立的文件。
1. 会把各自框架或工具自己的运行时代码提取为独立文件，避免重复，如 `webpack` 默认会在每个构建的 bundle 中都注入大致相同的运行代码，此时需要将其提取为一个公用的运行时文件，以及如 `@babel/plugin-transform-runtime`以及`@babel/runtime`所做的事，将 babel 运行时代码使用公共模块按需引用。
1. 即使核心业务代码，也有部分模块会被多个模块导入使用，此类模块需要视情况提取公共代码。

`webpack` 提取代码有以下几个途经：

1. 在入口 `entry` 中配置，分离 bundle
1. `import()`动态懒加载也会打包成独立的 bundle
1. `externals`阻止将某些依赖包打包进 bundle 中，而是通过应用运行时从外部获取这些*扩展依赖(external dependencies)*
1. `optimization.splitChunks` 配置，主动切割 bundle
1. `DllPlugin` 和 `DllReferencePlugin` 实现了拆分 bundle。`DLL` 一词代表微软最初使用的技术**动态链接库**。

### entry 分离 bundle

主要有两种方式：
- 多入口配置分离 bundle
- webpack@5 实现入口共享依赖

多入口配置一般用于分离两个较为独立模块，比如多页应用、第三方依赖等。

例子1：

有两个模块文件 `module-1.js` 和 `module-2.js`，原本都在 `index.js`中导入一起打包构建。
```js
// index.js
import module_1 from './module-1.js'
import module_2 from './module-2.js'
```
配置文件
```js
module.exports = {
  mode: 'none',
  entry: './index.js',
  output: {
    filename: '[name].bundle.js',
  },
}
```
为了分离两个模块文件的构建结果，我们可以改为以下配置：
```patch
module.exports = {
  mode: 'none',
-  entry: './index.js',
+  entry: {
+    module_1: './module-1.js',  
+    module_2: './module-2.js',  
}
  output: {
    filename: '[name].bundle.js',
  },
}
```
此时会产生两个构建结果插入到 html 中：`module_1.bundle.js / module_2.bundle.js`。

这种场景多用于可以用于多页应用：
> 每当页面跳转时，服务器将为你获取一个新的 HTML 文档。页面重新加载新文档，并且资源被重新下载
```js
entry: {
  userpage: './pages/user.js',  
  rolepage: './pages/role.js', 
```
但现代前端应用多为单页应用(SPA)，此场景配置较少见。

并且在入口处分包，webpack#4中并不好处理多个入口的共同依赖。

```js
// module-common.js
export default {
  count: 0
}

// module-1.js
import counter from './module-depend.js'
counter.count++
console.log('module-1', counter.count)

// module-2.js
import counter from './module-depend.js'
counter.count++
console.log('module-2', counter.count)
```
配置

```js
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: {
    module_1: './module-1.js',
    module_2: './module-2.js',
  },
  output: {
    path: path.resolve(__dirname, 'split-code-entry-common'),
    filename: '[name].bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin()
  ],
}
```
上面配置会输出两个 `module_1.bundle.js / module_2.bundle.js`，但是会有两个问题：
1. module-commom.js 被分别打包到了两个输出的 bundle.js 中
1. 公共模块中 count 对两个依赖是独立的，html 加载时会输出两个`1`这与 ESM 模块预期不符，预期是两个模块共享公共模块的导出的对象。

> 一个模块都不能被多次实例化很重要, ECMAScript模块和CommonJS模块都指定一个模块在每个JavaScript上下文中只能被实例化一次。这种规范保证了允许模块的顶级范围用于全局状态，并在该模块的所有用法之间共享。

这种情况下，在 webpack@5 中提供了 `Entry descriptor` 配置，可以在入口处将公共模块提取到独立的 chunkd。

```patch
// webapck@5
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
- entry: {
-   module_1: './module-1.js',
-   module_2: './module-2.js',
- },
+  entry: {
+    module_1: {
+      import: './module-1.js',
+      dependOn: 'common',
+    },
+    module_2: {
+      import: './module-2.js',
+      dependOn: 'common',
+    },
+    common: './module-common.js',
  },
  output: {
    path: path.resolve(__dirname, 'split-code-entry-common-single'),
    filename: '[name].bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin()
  ],
}
```
此时构建结果会输出三个`module_1.bundle.js / module_2.bundle.js / common.budnle.js`。

并且此时构建结果依赖于同一个 count，打开html会输出 `1, 2`

### `import()` 分离异步入口 bundle

`import()`动态加载模块可以实现 bundle 按需加载，具体见上面讲解。

### externals 分离 bundle

`externals` 配置的作用：就是告诉 webpack 在打包时不要将`externals`配置中的第三方依赖打包到输出的 bundle 中，对这些包的依赖，应用程序会从它运行的环境中获取。

我们先理解下，使用 webpack 构建的产物最终会在哪些环境下使用？也就是 **target **的配置值。常见的两种配置

- `target: web`: 构建的是一个 web 应用程序，它会运行在浏览器环境中。
- `target: node`: 构建的是一个 **npm** 包，或者说 **library**，它会运行在 node.js 环境中。

我们以这两种环境来说下，`external`如何配置

1. `target: web`当我们构建一个 web 应用程序时，如果 HTML 文件中插入两个 `script`标签，分别引用了 `a.js / b.js`

```html
<head>
  <script src="a.js"></script>
  <script src="b.js"></script>
</head>
```

此时如果在`a.js`中要引用`b.js`中的某个方法时，会怎么做？

- 将`b.js`中的某个方法暴露成全局变量，这样在 `a.js`中就可以直接引用了

假设我们在使用 webpack 构建一个 web 应用程序时，在代码中依赖了 `lodash`，入口代码是这样的：

```js
//entry-external.js
import _ from 'lodash'

const eleDiv = document.createElement('div')
eleDiv.textContent = _.join(['Hello', 'lodash'], ' ')

document.body.appendChild(eleDiv)
```

此时我们在 webpack 配置文件中，就会使用 external 配置，告诉 webpack 在打包时不要将 lodash 构建到 bundle 中，我们会在 HTML 中通过 CDN 方式引入。

```html
<body>
	<script src="https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.js"></script>
 	<script src="./bundle-external/bundle.js"></script>
</body>
```

配置文件

```js
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-external.js',
  output: {
    path: path.resolve(__dirname, 'bundle-external'),
    filename: 'bundle.js',
  },
  externals: {
    lodash: '_'
  }
}
```

`lodash: '_'`具体是什么意思呢？

**其中 key 键 `lodash` 指的是 `import xx from lodash` 中的 `lodash`，而 value 的值`_` 指是的cdn 引入时 lodash 挂载到全局变量 window 的属性 `_`。**

这个配置 key-value形式也就是告诉 webpack 在解析依赖关系时，碰到 `import xx from lodash`中 lodash时，把 `lodash` 替换成运行环境中全局属性 `_`

我们可以看下最终打包出来 bundle.js 中关于 `import _ from 'lodash'`的处理结果

```js
var __webpack_modules__ = ([
/* 0 */,
/* 1 */((module) => {
  				module.exports = _;
  			})
]);
```

以及 cdn 中 lodash 部分代码：

```js
// Export lodash.
var _ = runInContext();

// Some AMD build optimizers, like r.js, check for condition patterns like:
if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
  // 省略...
else if (freeModule) {
    // Export for Node.js.
    (freeModule.exports = _)._ = _;
    // Export for CommonJS support.
    freeExports._ = _;
} else {
  // Export to the global object.
  // 在浏览器端 root 就是 window 全局对象
  root._ = _;
}
```

2. `target: node`构建的是一个 **npm** 包，或者说 **library**，它会运行在 node.js 环境中。

此时 lodash 就成了该 library 的 `peerDependency(同行依赖)`，此时我们在项目的 package.json 中通常会配置该信息：

```json
{
   "peerDependencies": {
      "lodash": "4.17.21"
   }
}
```

此时 npm 安装 library 时，会检查是否有安装 lodash，否则会给出提示。

就像 `element-ui`必须依赖 `vue`一样。

```js
// element-ui 的 package.json 
"peerDependencies": {
    "vue": "^2.5.17"
  },
```

此时，在 library 构建时的配置：

```js
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-external.js',
  output: {
    path: path.resolve(__dirname, 'bundle-external'),
    filename: 'bundle-node.js',
    library: 'entryExternal',
    libraryTarget: 'commonjs2'
  },
  externals: {
    lodash: 'commonjs2 lodash'
  }
}
```

构建结果 `bundle-node.js`中对`import _ from 'lodash'`的处理结果

```js
var __webpack_modules__ = ([
/* 0 */,
/* 1 */((module) => {
		module.exports = require("lodash");;
})
```

所以 `lodash: 'commonjs2 lodash'` 中的 key 键 `lodash` 指的是 `import _ from 'lodash'`中的 lodash，而 value 值 `commonjs2 lodash`的 `lodash`值，从构建结果 `require('lodash')`可以看出是 package.json 中安装包的名称。

3. 当我们构建一个 library 时，有可能这个库即可以用于浏览器环境，也可以用于 node 环境。即此时 `libraryTarget:umd`，此时 `external` 的值就要用对象方式指明不同环境下对 `import _ from 'lodash'`中 lodash 如何替换

   ```js
   module.exports = {
     mode: 'none',
     context: path.resolve(__dirname, '../js-demo'),
     entry: './entry-external.js',
     output: {
       path: path.resolve(__dirname, 'bundle-external'),
       filename: 'bundle-node.js',
       library: 'entryExternal',
       libraryTarget: 'umd'
     },
     externals: {
       lodash: {
         commonjs: "lodash",
       	root: "_"
       }
     }
   }
   ```

   所以 `externals` 以字符串配置时默认为 web 环境中全局变量的替换。也对应着 `target`的默认值是 `var`。

### splitChunksPlugin 分离 bundle

webpack 4.x 重新设计和实现了代码分片的功能，并通过`optimization.splitChunks`进行配置。

`splitChunks`配置中最重要的概念就是 `cacheGroups` 属性的配置。它可以让我们自定义如何切分 chunk 的规则。

比如我们需要把项目中用到第三方依赖包从业务代码中切分出来，构建到一个独立的 bundle 中。可以像下面这样配置 test 属性来匹配，就如同 module.rule.test 属性一样：
```js
module.exports = {
  // 省略其它基本项
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
        }
      }
    }
  }
}
```
当然，我们还可以更精细化控制如何切分代码，比如大小限制、被引用次数限制、并行请求数限制等。举例说某个第三方依赖包只有几kb大小，就完全没必要切分。所以一个 cacheGroup 的完全配置项有：
```js
module.exports = {
  // 省略其它基本项
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          // 匹配条件
          chunks: 'async', // async: 只提取异步 chunk; initial: 包含入口 chunk； all：两种模式同时开启
          test: /[\\/]node_modules[\\/]/,
          minSize: { // 生成块的最小大小（以字节为单位）
            javascript: 30000,
            style: 50000,
          },
          maxSize: 0, // 构建结果 chunk 最大值，大于此值将被拆分多个。为 0 则不限制
          minChunks: 1, // 分割之前，模块必须在块之间共享的最短次数
          maxAsyncRequests: 5, // 按需加载时并行请求的最大数量
          maxInitalRequests: 3, // 首次加载时入口点的最大并行请求数
          enforce: false, // 为 true 时，webpack 会忽略 splitChunks.minSize、splitChunks.minChunks、splitChunks.maxAsyncRequests、splitChunks.maxInitialRequests 这几个配置项限制，强制拆分。
          reuseExistingChunk: true, // 已经存在的已拆分的 chunk，将直接复用
          name: true, // Boolean / String
          atuomaticNameDelimiter: '~',
          filename: '[id].js',
          type: '', // webpack@5
        }
      }
    }
  }
}
```
实际上这个插件就配置了两个默认的缓存组：
```js
module.exports = {
  // 省略其它基本项
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          chunks: 'async', 
          test: /[\\/]node_modules[\\/]/,
          minSize: {
            javascript: 30000,
            style: 50000,
          },
          maxSize: 0,
          minChunks: 1,
          maxAsyncRequests: 5,
          maxInitalRequests: 3,
          enforce: false, 
          reuseExistingChunk: true,
          priority: -10,
        },
        default: {
          chunks: 'async',
          test: true,
          minSize: { 
            javascript: 30000,
            style: 50000,
          },
          maxSize: 0, 
          minChunks: 2,
          maxAsyncRequests: 5, 
          maxInitalRequests: 3, 
          enforce: false, 
          priority: -20,
          reuseExistingChunk: true,
        }
      }
    }
  }
}
```
可以看到，两个默认缓存组其时是有一些重复配置属性的，这部分属性可以放在上一级对象属性中作为公用配置，优先级低于缓存组内部属性，可以在缓存组中再定义同样属性覆盖公用配置。
```js
module.exports = {
  // 省略其它基本项
  optimization: {
    splitChunks: {
      chunks: 'async', 
      minSize: {
        javascript: 30000,
        style: 50000,
      },
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitalRequests: 3,
      enforce: false, 
      reuseExistingChunk: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        default: {
          // test: true, // 默认值就是所有，所以也可以省略
          minChunks: 2, // 覆盖上一级公用配置
          priority: -20,
          reuseExistingChunk: true,
        }
      }
    }
  }
}
```
我们可以增加一个拆分规则，比如在 css 模块提取成一个构建产物时配置：
```js
module.exports = {
  // 省略其它基本项
  optimization: {
    splitChunks: {
      chunks: 'async', 
      minSize: {
        javascript: 30000,
        style: 50000,
      },
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitalRequests: 3,
      enforce: false, 
      reuseExistingChunk: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        default: {
          // test: true, // 默认值就是所有，所以也可以省略
          minChunks: 2, // 覆盖上一级公用配置
          priority: -20,
          reuseExistingChunk: true,
        },
        styles: {
          name: 'style-split',
          filename: 'css/[name].css', // 这里的变量占位符 name 就会是上面自定义的 name: style-split-merge，所以最终的输出文件名是 css/style-split.css
          type: 'css/mini-extract', // 识别需要合并的 css 为 miniCssExtractPlugin 处理后的 chunk。在 webpack 4.x 中使用 test: /\.css$/i 代替。
          chunks: 'all',
          enforce: true,
        }
      }
    }
  }
}
```
关于各个属性详细解析参考[SplitChunksPlugin文档翻译](https://github.com/gexiaolin/SplitChunksPlugin)

> 特别注意理解 chunks 的不同值配置会有什么结果，以及理解 maxAsyncRequests 和 maxInitalRequests

### DLL 动态链接库

首先认识下**动态链接库**的概念：

在 windows 系统中经常看到 `.dll` 后缀的文件，这些文件叫作动态链接库，在一个动态链接库中包含了提前编译过的为其它模块调用的函数和数据。

所以 webpack 的 `DllPlugin` 插件借鉴了这个思想，把项目中公用的体积较大的链接提前打包构建一次，之后项目的构建过程中被动态链接库包含的模块将不会再重新构建，而是直接使用动态链接库中的代码，这样就可以提升构建速度。

在 webpack 中要使用成动态链接库抽离公用或独立的模块，需要使用 `DLLPlugin` 和 `DLLReferencePlugin` 两个内置插件:

- `DllPlugin` 插件在一个独立的 webpack 配置文件，通常命名为 `webpack.dll.config.js` , 构建一个只有 dll 的 bundle(dll-only-bundle)。

同时这个插件会生成一个名为 `manifest.json` 的文件，这个文件是用来让 `DLLReferencePlugin` 映射到相关的依赖上去的。

- `DLLReferencePlugin` 插件应用于项目构建工程中的配置文件中，指示构建过程中如何从 `mainifest.json` 中找到链接库中的模块。

由于上面需要两个插件且配置复杂，基本弃用，出现了替代插件 `autodll-webpack-plugin` 简化配置。

```js
module.exports = {
  // ......
  plugins: [
    // 配置要打包为 dll 的文件
    new AutoDllPlugin({
      inject: true, // 设为 true 就把 DLL bundles 插到 index.html 里
      filename: '[name].dll.js',
      context: path.resolve(__dirname, '../'), // AutoDllPlugin 的 context 必须和 package.json 的同级目录，要不然会链接失败
      entry: {
         react: [
            'react',
            'react-dom'
         ]
        }
     })
  ]
}
```

但是到了 webpack@5 后，推荐使用效果更好的`HardSourceWebpackPlugin` 插件实现类似功能。

```js
module.exports = {
  // ......
  plugins: [
    new HardSourceWebpackPlugin() // <- 直接加入这行代码就行
  ]
}
```

参考链接[webpack之优化篇（四）：hard-source-webpack-plugin,webpack DllPlugin配置的代替方案](https://blog.csdn.net/hope_It/article/details/102691300)


### runtimeChunk 运行时代码抽离

webpack 在构建的每个 chunk 中会有插入一段实现 webpack 依赖模块调用的代码，与业务代码一起运行，所以也称为运行时代码。

比如最简单的一个 bundle.js 代码
```js
 (() => { // webpackBootstrap
 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
 ((__unused_webpack_module, exports) => {

exports.genRandomNumber = function(n) {
  return Math.round(Math.random() * Math.pow(10, n))
}

 })
 	]);

/** webpack 运行时代码 *************************************************/
 	// The module cache
 	var __webpack_module_cache__ = {};
 	
 	// The require function
 	function __webpack_require__(moduleId) {
 		// Check if module is in cache
 		if(__webpack_module_cache__[moduleId]) {
 			return __webpack_module_cache__[moduleId].exports;
 		}
 		// Create a new module (and put it into the cache)
 		var module = __webpack_module_cache__[moduleId] = {
 			// no module.id needed
 			// no module.loaded needed
 			exports: {}
 		};
 	
 		// Execute the module function
 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
 	
 		// Return the exports of the module
 		return module.exports;
 	}
 	
/************************************************************************/
var __webpack_exports__ = {};
(() => {
const { genRandomNumber } = __webpack_require__(1)

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'

  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())
})();

 })()
;
```

更复杂模块依赖的打包结果中还包括以下方法的实现代码：
```
__webpack_require__
__webpack_require__.d
__webpack_require__.o
__webpack_require__.r
__webpack_require__.x
webpackJsonpCallback
checkDeferredModulesImpl
...
```
所以理想情况下，正常业务项目会产生很多个 chunk，我们希望这些 chunk 能共用这些运行代码。此时就可以设置 `optimization.runtimeChunk`
```js
module.exports = {
  //...
  optimization: {
    runtimeChunk: false, // 默认值是每个入口 chunk 中直接嵌入 runtime。
    runtimeChunk: "single", // 会创建一个在所有生成 chunk 之间共享的运行时文件，默认名为 runtime
    // 如果需要对提取运行时文件自定义命名，比如多入口时添加入口名称加以区分，则可以用对象设置
    runtimeChunk: {
      name: 'runtime', // 默认值, 等同于直接设为 single
      name: (entrypoint) => `runtime~${entrypoint.name}`,
    }
  },
};
```
案例可见目录 `entry-demo/split-code-entry-depend-runtime-single`

## 压缩

压缩 js 文件大多数使用的工具有两个，一个是 `UglifyJS`，被 webpack 3.x 集成，另一个是 `terser`，被 webapck 4.x 集成。由于后者支持 ESnext 代码的压缩，所以从 webpack 4.x 开始默认使用 terser 的插件 `terser-webpack-plugin`。

在 webpack 4.x 以后要开启 js 代码压缩，可以直接设置 `optimization.minimize: true`。当`mode: 'production`时默认开启。

如果需要对`terser-webpack-plugin`插件的压缩选项进行自定义配置，可以`optimization.minimizer`进行设置
```js
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  optimization: {
    minimizer: [
      // minimize:true 时的启用 terser-webpack-plugin 插件，该插件可用的配置项及默认值如下
      new TerserPlugin({
        test: /\.m?js(\?.*)?$/i,
        include: undefined, // string, regexp
        exclude: undefined, // string, regexp
        cache: false, // 是否开启缓存，默认缓存目录 node_modules/.cache/terser-webpack-plugin，传入字符串可以修改路径
        parallel: true, // 开启多进程进行压缩，传入数字可指定进程数, 设为 true 时，默认启用 os.cpus().length - 1
        sourceMap: false, // 是否生成 sourceMap, 需要同时存在 devtool 配置。
        minify: ''terser, // 指定自定义的压缩器，默认 terser
        terserOptions: { // terser 自身配置项，具体参考https://terser.org/docs/api-reference
          parse: {
            // parse options
            bare_returns: false, // 支持顶级return语句
            html5_comments: true,
            shebang: true, // 支持#!command作为第一行
          },
          compress: {
            // compress options
          },
          mangle: {
            // mangle options

            properties: {
              // mangle property options
            }
          },
          format: {
            // format options (can also use `output` for backwards compatibility)
          },
          sourceMap: {
            // source map options
          },
          ecma: 5, // specify one of: 5, 2015, 2016, etc.
          keep_classnames: false,
          keep_fnames: false,
          ie8: false,
          module: false,
          nameCache: null, // or specify a name cache object
          safari10: false,
          toplevel: false,
        },
      }),
    ],
  },
};
```

