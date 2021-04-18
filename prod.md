# 生产环境构建

- DCE(Dead Code Elimination)
- Tree Shaking：
  - babel-loader 配置项 module: false
  - optimization.usedExports：开启对 exports 有用和无用导入的标识
  - sideEffects 副作用及相关的 optimization.sideEffects, package.json.sideEffects
- scope hoisting 作用域提升
- 文件指纹策略：长效缓存 hash / chunkhash / comtenthash


tree-saking 相关概念：  optimization.providedExports


## DCE(Dead Code Elimination) 死代码消除

Dead Code 死代码，即当前应用程序不使用的代码，概括为：**不会执行、不被用到、只写不读**
1. 不会执行：即无法到达的代码: 
  - 执行不了的判断
  - 执行不到的循环
  - return 后的代码(Unreachable code)
```js
// 执行不了的判断
function temp() {
    var a = 2;
    if (a > 3) {
         return 3; // Dead Code
    }
}
// return 后的代码
function temp() {
    return 1;
    var a = 2; // Dead Code
}
// 执行不到的循环
function temp() {
    var a = 2;
    while (false) {
         return 3; // Dead Code
    }
}
```
2. 不被用到
```js
function temp() {
  // 声明了但未被使用的变量 x unused
  let x = 1
  function unused() {
    return 5
  }
  let a = 5
  return a
}
```
3. 只写不读
```js
function func(a, b) {
    var x;
    var i = 300;
    while (i--) {
        x = a + b; // Dead store
    }
}
```

传统编译型的语言中，都是由编译器将 Dead Coden从nAST（抽象语法树）中删除，那 javascript 中是由谁做 DCE 呢？

首先肯定不是浏览器做 DCE，因为当我们的代码送到浏览器，那还谈什么消除无法执行的代码来优化呢，所以肯定是送到浏览器之前的步骤进行优化。

其实也不是熟悉的构建工具 rollup / webpack 等做的，而是由代码压缩工具来完成 DCE，在 webpack@3.x 绑定的是 uglify，webpack@4.x 绑定的是 Terser。

```js
// dce.js
function writeOnly(a, b) {
    var x;
    var i = 300;
    while (i--) {
        x = a + b; // 只写不读
    }
}

function unexecuted() {
  // 执行不了的判断
    var a = 2;
    if (a > 3) {
         return 3; // Dead Code
    }
  // 执行不到的循环
  while (false) {
         return 3; // Dead Code
    }
  
  return a
  
  // return 后的代码
  a= 10
}

function unused() {
  console.log('can not output')
}

(function run() {
  writeOnly()
  unexecuted()
  let x = 1
  console.log(x)
})()
```
首先只简单用 webpack 打包，会原样输出到 bundle 中。
```js
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './dce.js',
  output: {
    path: path.resolve(__dirname, 'bundle-dce'),
    filename: 'bundle-dce.js',
  },
}
```
现在添加 `terser-webpack-plugin` 配置
```patch
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './dce.js',
  output: {
    path: path.resolve(__dirname, 'bundle-dce'),
    filename: 'bundle-dce.js',
  },
+  optimization: {
+    minimize: true, // 默认使用 terser-webpack-plugin
+  }
+ // 或者 const TerserPlugin = reuqier('terser-webpack-plugin')
+ plugins: [
+  new TerserPlugin()
+]
}
```
输出结果：
```js
// bundle-dce.js
(function(o,n){for(var c=300;c--;);})(),console.log(1);
```

压缩工具的 DCE 功能清除了无用的代码，主要是解析代码得到 AST(抽象语法树)，然后遍历该树以查找未使用的函数和变量，最后将该树转换回JavaScript源代码。

DCE 功能的缺点是只能对单文件进行解析并处理 Dead Code。

对于现代模块化的 js 代码组织结构，模块文件的导入导出，同样存在很多无用的模块导出代码。比如：

```js
// math.js
export function square(x) {
  return x * x;
}

export function cube(x) {
  return x * x * x;
}

// 在入口文件中只使用了其中一个 cube 方法
import { cube } from './math.js';
const result = cube(5)
console.log(`cube(5) = ${result}`)
```
我们没有从 `math.js` 模块中 import 另外一个 `square` 方法。这个函数也属于“死代码(dead code)”，理想情况下，打包构建结果应该删除掉未被引用的 `export square`。

但使用 DCE 同样的配置，看下构建结果中并没有删除 `square` 函数。

而这种情形正是 `Tree Shaking` 作用的地方。

## Tree Shaking

[Tree-Shaking性能优化实践 - 原理篇](https://juejin.cn/post/6844903544756109319)

** webpack 中的 tree-shaking 关注于无用模块的消除，可以将未被使用的 exported member 标记为 unused，然后由压缩工具清除被标识为 unused 无用的 exported 代码。 包括：1. 那些未被 import 引入的 export 代码；2.或者 import 了但未被使用的 export 代码。**

```js
import { cube } from './math.js'; // 能 tree shaking 掉 math.js 中的 export square
import { cube, square } from './math.js'; // 同样可以 tree shaking 掉 square

console.log(cube(5))
```
### 为什么叫 Tree Shaking（摇树优化）？

您可以将您的应用程序想象成一棵树。您实际使用的源代码和库表示树的绿色活叶。死代码表示秋天被树木消耗的褐色枯叶。为了摆脱枯叶，您必须摇晃树，使它们掉落。

Tree Shaking 最早由 Rollup 实现并推广，然后 webpack@2.x 开始正式内置支持2015模块，和对未引用模块的检测能力，即 Tree Shaking 功能。

### Tree Shaking 与 DCE

所以 Tree Shaking 也属于 DCE 范畴内，是 DCE 的另一种功能实现，针对跨文件的模块引用产生的死代码清除。

### Tree Shaking 的实现前提

项目模块规范使用 ES Module 规范。因为 ES6 模块依赖关系是确定的，和运行时的状态无关，可以进行可靠的静态分析，这就是tree-shaking的基础。

所谓静态分析就是不执行代码，从字面量上对代码进行分析，ES6之前的模块化规范，比如我们常用的  CommonJS 规范可以动态 require 一个模块，此时只有执行后才知道引用了什么模块，这个就不能通过静态分析去做优化。这是 ES Module 在设计时的一个重要考量，也是为什么 rollup 和 webpack 2 都要用 ES module syntax 才能 tree-shaking。

> ES6 module 特点：
> - 只能作为模块顶层的语句出现
> - import 的模块名只能是字符串常量
> - import binding 是 immutable(不可变的)

```js
// 导入并赋值给 JavaScript 对象，然后在下面的代码中被用到，这会被看作“活”代码，不会做 tree-shaking
import Stuff from './stuff';
doSomething(Stuff);

// 导入并赋值给 JavaScript 对象，但在接下来的代码里没有用到，这就会被当做“死”代码，会被 tree-shaking
import Stuff from './stuff';
doSomething();

// 具名导入，bar 导入但未使用的会被 tree-shaking
import { foo , bar } from './stuff'
doSomething(foo())

// 导入但没有赋值给 JavaScript 对象，也没有在代码里用到，这会被当做“死”代码，会被 tree-shaking
import './stuff';
doSomething();

// 导入整个库，但是没有赋值给 JavaScript 对象，也没有在代码里用到
// 非常奇怪，这竟然被当做“活”代码，因为 Webpack 对库的导入和本地代码导入的处理方式不同。
import 'my-lib';
doSomething();
```

### Tree-shaking的实现

如果使用的 webpack@4 只需要将 `mode: production`，即可开启tree-shaking。

如果使用的是 webpack@2 可能你会发现tree-shaking 并不起作用，因为 Babel 默认会将代码编译成Commonjs模块。而tree-shaking 的实现需要基于 ES Module

所以通常在使用了 babel 配置的项目工程时，需要禁用 Babel 默认的将ES6模块转换为CommonJS模块的功能

1. 确保项目代码基于 ES Module
  1.1. 确保 Babel 转换结果为 ES Module。
```js
module.exports = {
  // 省略
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
          options: { // 此 options 也可以在 babel.config.js 中配置
            presets: [
              ['@babel/preset-env', {modules: false}]
            ]
          }
        }
      }
    ]
  }
}

// 或者 babel.config.js
module.exports = {
  presets: [
    [
      '[@babel/preset-env]',
      {
        modules: false
      }
    ]
  ]
};
```
  1.2 导入 ES Module 规范的库

比如 `lodash` 是基于 CommonJS 规范的库，无法 Tree Shaking，使用对应的 ES Module 规范的库 `lodash-es`。

或者使用 package.json 中提供了 `moudle` 属性的库。


2. 开启优化选项 “usedExports” 设置为true。

这意味着告诉 Webpack 识别出已使用的和没有被使用的 exports 代码，并在最初的打包步骤中给它做标记，以使在 Terser 阶段实现 Tree Shaking 清除。

```js
 module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './dce-module.js',
  output: {
    path: path.resolve(__dirname, 'bundle-dce'),
    filename: 'bundle-dce-module-usedExports.js',
  },
}
```
未开启 `optimization.usedExports` 的构建结果：
```js
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "square": () => (/* binding */ square),
/* harmony export */   "cube": () => (/* binding */ cube)
/* harmony export */ });
function square(x) {
  return x * x;
}

function cube(x) {
  return x * x * x;
}

/***/ })
/******/ 	]);

// 省略代码...

```

开启 `optimization.usedExports` 的构建：
```patch
 module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './dce-module.js',
  output: {
    path: path.resolve(__dirname, 'bundle-dce'),
    filename: 'bundle-dce-module-usedExports.js',
  },
+  optimization: {
+    usedExports: true,
+  }
}
```
```js
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "cube": () => (/* binding */ cube)
/* harmony export */ });
/* unused harmony export square */
function square(x) {
  return x * x;
}

function cube(x) {
  return x * x * x;
}

/***/ })
/******/ 	]);

// 省略代码....
```

可以看到前后对 `square` 的注释变化，最关键的注释标识：`/* unused harmony export square */`

此时，开启压缩选项 `optimization.minimize: true`，可以看到构建结果中已经没有 `square` 相关代码了。

### Tree Shaking 对类中变量和方法的效果

Tree Shaking 对 export 的项层函数和变量效果已在上例中实现。但在 webpack@4.x 中，对导入但未使用的类，Tree Shaking 是没有效果的。但在 webpack@5.x 版本，Tree Shaking 对未使用的类代码是有效的。

> 所以 [Tree-Shaking性能优化实践 - 原理篇](https://juejin.cn/post/6844903544756109319)中对类的消除实验结果已不正确。

```js
// classMethod.js
export default class Menu {
  constructor() {
    this.display = 'none'
  }
  show() {
    this.display = 'block'
  }
  hide() {
    this.display = 'none'
  }
  isShow() {
    return this.display === 'block'
  }
}

// entry-class.js
import Menu from './classMethod.js' // 导入类，但未使用，webpack@5.x tree shaking 生效

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack tree shaking class method'

  return eleDiv
}
document.body.appendChild(genElement())
```
```js
 module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-class.js',
  output: {
    path: path.resolve(__dirname, 'bundle-class'),
    filename: 'bundle.js',
  },
  optimization: {
    minimize: true,
    usedExports: true,
  }
}
```

## sideEffects 副作用

什么是副作用？

在函数式编程中，副作用概念与纯函数部分对应，副作用是指当调用函数时，除了返回函数值之外，还对函数调用者产生附加的影响，或者说对当前函数作用域之外的范围产生了附加的影响。例如修改全局变量（函数外的变量）或修改参数。

对于运行在浏览器的 JS 来讲，副作用包括且不限于
- console.log()
- 操作 DOM
- http 请求
- 修改全局变量
- ...

可以发现，尽管被叫做副作用，但是大多数情况下，这些副作用却是我们程序的目的所在。所以在函数式编程中，原则上并不禁止副作用，而是提倡"优雅的"处理副作用。

Webpack@4 版本对 Tree Shaking 功能进行了扩展，通过设置 `sideEffects` 属性向编译器提供提示，以指示项目中的哪些文件是“纯的（Prue)，即无副作用的”和"有副作用的"，对于纯的代码，如果不使用它们就可以安全进行 Tree Shaking；如果标识这段代码是有副作用的，则 Tree Shaking 对其不生效。

比如常见的两种情形：
```js
import '/path/to/global.css' // 样式导入
import '@babel/polly-fill' // ployfill 导入
```
如果开启 Tree Shaking，默认也会对以上两种导入生效，但这并不是我们想要的结果，显然删除这种导入代码后，会对应用程序产生副作用。

所以此时我们就可以设置 `optimization.sideEffects: true`，告诉 webpack 去解析 package.json 中 `sideEffects` 属性，指示 Terser 这类压缩器不要对这些模块进行 tree shaking。

```js
// 所有文件都有副作用，全都不可 tree-shaking
{
 "sideEffects": true
}
// 没有文件有副作用，全都可以 tree-shaking
{
 "sideEffects": false
}
// 只有这些文件有副作用，所有其他文件都可以 tree-shaking，但会保留这些文件
{
 "sideEffects": [
  "/src/**/*.css",
  "@babel/polly-fill",
 ]
}
```

对于某些类型的模块如果要指定副作用，也可以通过 `module.rule.sideEffects` 属性配置副作用。

```js
// import '/path/to/xx.css' 指定样式导入具有副作用，不应用 tree shaking 功能
const config = {
 module: {
  rules: [
   {
    test: /\.css$/i,
    use: ['sytle-loader', 'css-loader'],
    sideEffects: true,
   }
  ]
 } 
};
```

例子：
```js
// global.js
const ele = document.createElement('h1')
ele.textContent = 'this is append by import'
document.body.append(ele)
```
```css
/* index.css */
.hello {
  font-size: 20px;
  font-weight: 600;
  color: orange;
}
```
```js
// entry-side-effect.js
import './index.css'
import './global.js'
function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack tree shaking side effect'

  return eleDiv
}
document.body.appendChild(genElement())
```
```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>tree shaking</title>
</head>
<body>
  <script src="./bundle-side-effect/bundle-tree-shaking.js"></script>
</body>
</html>
```
设置项目根目录 package.json 中添加:
```json
"sideEffects": false,
```
配置文件
```js
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-side-effect.js',
  output: {
    path: path.resolve(__dirname, 'bundle-side-effect'),
    filename: 'bundle-tree-shaking.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          'css-loader'
        ],
      },
    ]
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true, // 开启对 package.json 中 sideEffects 属性的解析
  }
}
```
此时打开 html 文件，发现 `index.css` 和 `global.js` 都没有生效。即 tree shaking 功能对 `import './index.css'; import './global.js'` 语句生效，使得其代码都被清除了。

如果要指明这两个文件具有副作用，使得 tree shaking 对其不生效。可以在修改 package.json 中 sideEffects 属性。

```patch
- "sideEffects": false,
+"sideEffects": [
+  "*.css",
+  "**/*/global.js",
+]
```
或者对其中样式文件的副作用声明改为如下方式：
```patch
// webapck.config.js
module: {
  rules: [
    {
      test: /\.css$/i,
      use: [
        'style-loader',
        'css-loader'
      ],
+       sideEffects: true,        
    },
  ]
},

// package.json
+"sideEffects": [
+  "**/*/global.js",
+]
```
## scope hoisting 作用域提升

`Scope Hoisting` 是 webpack@3.x 的新功能，直译为 **作用域提升**。

在 JavaScript 中，还有“变量提升”和“函数提升”，JavaScript 会将变量和函数的声明提升到当前作用域顶部，而“作用域提升”也类似，webpack 将引入到 JS 文件“提升到”它的引入者的顶部。

```js
// math.js
export function cube(x) {
  return x * x * x;
}

// entry-scope-hositing.js
import { cube } from './math.js'
console.log('cube(5) = ' + cube(5))
```
配置文件
```js
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-scope-hositing.js',
  output: {
    path: path.resolve(__dirname, 'bundle-scope-hositing'),
    filename: 'bundle.js',
  },
}
```
打包结果
```js
(() => {
	"use strict";
	var __webpack_modules__ = ([
  /* 0 */,
  /* 1 */
  ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
      __webpack_require__.r(__webpack_exports__);
      /* harmony export */ __webpack_require__.d(__webpack_exports__, {
      /* harmony export */   "cube": () => (/* binding */ cube)
      /* harmony export */ });
      function cube(x) {
        return x * x * x;
      }
  })
  ]);
// 省略 webpack 运行时注入代码

var __webpack_exports__ = {};
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _math_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
console.log('cube(5) = ' + (0,_math_js__WEBPACK_IMPORTED_MODULE_0__.cube)(5))
})();

})();
```
### 问题

默认情况下，webpack 打包构建后，将依赖的各个模块包裹到一个箭头函数中，并存放在`__webpack_modules__`数组中。如果一个复杂项目存在很多模块依赖，就会存在大量函数声明。这会导致如下问题：
- ⼤量作用域包裹代码，导致体积增大（模块越多越明显）
- 运行代码时创建的函数作⽤域变多，内存开销变大

### 解决方案：scope hoisting 作用域提升

手动开启 scope hoisting 功能

> webpack 生产构建时默认开启。

```js
// webpack@3 需要添加这个插件
plugins: [
  new webpack.optimize.ModuleConcatenationPlugin()
]

// webpack@4 只需要设置优化选项 concatenateModules: true 开启作用域提升，内部也是启用 ModuleConcatenationPlugin 插件。
optimization: {
  concatenateModules: true,
},
```

修改配置文件代码
```patch
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-scope-hositing.js',
  output: {
    path: path.resolve(__dirname, 'bundle-scope-hositing'),
-    filename: 'bundle.js',
+    filename: 'bundle-scope-hositing.js',
  },
+ optimization: {
+    concatenateModules: true,
+  }
}
```
构建结果
```js
(() => {
	"use strict";
	// The require scope
	var __webpack_require__ = {};
	
// 省略 webpack 运行时代码

var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

;// CONCATENATED MODULE: ./math.js
function cube(x) {
  return x * x * x;
}
;// CONCATENATED MODULE: ./entry-scope-hositing.js

console.log('cube(5) = ' + cube(5))
})();
```
可以看到，开启了 `scope hositing` 功能后，构建结果中，将依赖模块的代码直接内联到了入口模块的函数作用域中。这样通过 scope hoisting 可以减少函数声明代码和内存开销，让 webpack 打包出来的代码文件更小，运行更快。

### scope hositing 原理和前提条件

scope hoisting 作用域提升原理：将所有模块的代码按照引用顺序放在⼀个函数作用域里，然后适当的重命名⼀些变量以防止变量名冲突。

而能实现此操作的前提是，项目使用 ES Module 模块规范。因为ES Module 模块规范的语法特点：
- import 和 export 关键字必须在顶层
- 模块路径只能用字符串字面量

这种“强制静态化”的做法使代码在编译时就能确定模块的依赖关系，以及输入和输出的变量，所以能基于此，能在编译时对模块依赖进行上述作用域提升的操作。

### 局限性

webpack 会尝试实现作用域提升，将模块合并到单个作用域中。但不能在所有情况下都这样做，有些情况下，如果 webpack 无法实现 scope hositing，就会降级处理成默认的单个函数声明的形式。

比如以下情况，具体见官网中 [module-concatenation-plugin](https://webpack.js.org/plugins/module-concatenation-plugin/#optimization-bailouts)插件说明
- 使用了 ProvidePlugin
- 使用了 eval() 函数
- 你的项目有多个 entry
- 异步加载的模块
- 非入口加载模块
- 开启了 HMR
- 非 ES Module 模块规范

如果项目开启了作用域提升，但未生效，可以在命令中添加以下参数`-display-optimization-bailout`查看输出的原因
```js
webpack --display-optimization-bailout
```

考虑到 Scope Hoisting 依赖源码需采用 ES6 模块化语法，但现代的第三方依赖库会同时构建提供 ES6 模块化的代码，入口文件由 package.json 中的 module 属性提供。。所以为了充分发挥 Scope Hoisting 的作用，可以增加以下模块解析的配置：
```js
module.exports = {
  resolve: {
    // 针对 Npm 中的第三方模块优先采用 module 属性指向的符合 ES6 模块化语法的文件
    mainFields: ['module','main']
  },
};
```
> 目前 pkg.module 还只是一个提案，并不是 package.json 文件标准格式的一部分。但它极有可能会成为标准的一部分，因为它目前已经是事实上的标准了（最早由 Rollup提出，Webpack也已支持）。
>main : 定义了 npm 包的入口文件，browser 环境和 node 环境均可使用
>module : 定义 npm 包的 ESM 规范的入口文件，browser 环境和 node 环境均可使用
>browser : 定义 npm 包在 browser 环境下的入口文件

## 文件哈希指纹和持久缓存

### 什么是文件哈希指纹 hash

- `hash`，中文译作哈希或散列。
- Webpack 在构建时会根据文件内容计算出一个特殊的字符串，使用的就是**hash算法**，这个特殊字符串一般叫做**hash值**。
- 默认 hash 值长度有 20 位，但在实际使用时可以通过 `[hash:n]` 形式指定截取 n 位。一般取前八位`[hash:8]`，因为 hash 算法计算出 hash 值的前八位基本可以保证唯一性了。

在 Webpack 的体系中，除了有`hash`，还有`chunkhash`和`contenthash`，这三者有什么不同呢？

首先，`hash`、`chunkhash`和`contenthash`这三者都是根据文件内容使用 hash 算法计算出的hash值，区别在于它们所计算的文件范围不一样。

- hash：在 webpack 一次构建中会产生一个 compilation 对象，该 hash 值是对 compilation 内所有的内容计算而来的。简单于参与当前 compilation 过程的全部文件。
- chunkhash: 参与当前 chunk 构建的所有文件。(chunk 是一组有依赖关系的模块集合)
- contenthash: 单个文件

> contenthash在webpack4 之前都只能在css上使用，并不能在js上使用,所以有些资料直接写 contenthash 指 css 文件,这是不准确的.目前 v4 版本后 contenthash 已经不仅限于 css 文件了.

> 理解 webpack 中 bundle / chunk / module 的关系:
> 多个有依赖关系的 module 会合并构建成一个 chunk
> 一个或多个 chunk 构建输出一个 bundle，可用于浏览器或 node 直接执行。

### 持久缓存策略

那么文件哈希指纹有什么作用呢？可用于实现浏览器页面资源的缓存。

要理解持久缓存策略，就需要理解以下概念：WEB缓存、浏览器缓存、浏览器页面资源的三级缓存机制、网络请求中缓存相关请求和响应头字段，具体可从此处了解[Web Cache 资源缓存机制](http://fer123.gitee.io/Browser/Render/cache.html#%E4%BB%80%E4%B9%88%E6%98%AFweb%E7%BC%93%E5%AD%98)

简单理解就是：
1. 浏览器对每次请求的页面资源会默认以文件名称缓存到本地，当浏览器再次请求时就可以从快速从本地读取资源，省掉了网络请求。
1. 如果文件内容变更了，我们会重新构建项目工程，重新部署上线发布。
1. 此时最理想的情况是，浏览器能对有内容变更的页面资源重新发起请求，更新本地缓存，对没有内容的变更的页面资源还是使用本地缓存。
1. 由于浏览器是以资源名称进行缓存的，所以要实现上述需求，只需要在项目构建中，有内容变化的资源名称重新命名，没有内容变化的资源名称不变即可。这就可以使用合适的 `hash / chunkhash / contenthash`  值来命名输出的构建资源。

### hash 的用法

文件哈希指纹通常用作构建产物的命名中，常见有以下几处：
- webpack 构建的输出配置 `output` ，其中有几种对不同类型输出配置
- 还有插件的选项配置
- 以及代码切割 splitChunks 中缓存组的配置。

```js
module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name]@[hash:8].js', // 输出 bundle 命名
    assetModuleFilename: 'images/[name]@[contenthash:8][ext]', // 静态资源输出命名
    chunkFilename: 'js/[name]@[chunkhash:8].js', // 非入口依赖构建输制品的命名，比如异步加载的
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name]@[contenthash:8].css',
      chunkFilename: 'css/[name]@[chunkhash:8].css',
    }),
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'css-purged', // 默认会以 key 加splitChunks.atuomaticNameDelimiter 连接所依赖的模块拼接而成,如 vendors~a~b~c.js
          filename: 'css/[name]@[chunkhash:8].css', 
          type: 'css/mini-extract', // webpack@5.x
          // test: /\.css$/, // For webpack@4
          chunks: 'all',
          enforce: true, // 强制合并，告诉 webpack 忽略默认的 `splitChunks.minSize`、`splitChunks.minChunks`、`splitChunks.maxAsyncRequests` 和 `splitChunks.maxInitialRequests` 选项，并始终为此缓存组创建 chunk。
        },
      },
    },
  },
};
```

例子：
```css
/* index.css */
.hello {
  font-size: 20px;
  font-weight: 600;
  color: orange;
}
```
```js
// async.js
export default function append() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = `This is async loaded`
  document.body.appendChild(eleDiv)
}

// utils.js
export function cube(x) {
  return x * x * x;
}

// entry indexj.s
import { cube } from './utils.js';
import './index.css'

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack hash: cube(5)=' + cube(5)

  // 启动异步加载的按钮
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to load async.js'
  eleBtn.onclick = function() {
    import(/* webpackChunkName: 'async' */'./async.js').then((res) => {
      console.log('异步加载成功', res)
      res.default()
    })
  }

  eleDiv.appendChild(eleBtn)
  return eleDiv
}
document.body.appendChild(genElement())
```
配置文件 webpack.config.js
```js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../hash-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-hash'),
    filename: '[name]~[hash:8].js',
    chunkFilename: '[name]~[hash:8].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name]~[hash:8].css',
    }),
  ],
}
```
上述配置，最终bundle的依赖如下：
```
    Source                  Chunk

  index.css   +--------->   main-hash:8.css

  +----------+
  | index.js |
  |          +---------->   main-hash:8.js
  | utils.js |
  +----------+

  async.js  +--------->   async-hash:8.js
```
使用`[hash]`命名，初次构建后的 hash 值：`0a12868c`
```
main~0a12868c.js
async~0a12868c.js
main~0a12868c.css
```
改变任一个文件内容，比如这里改变 index.css 内容，再次构建后 hash 值: `37e9587a`，并且所有输出文件的名称都改变了。
```
main~37e9587a.js
async~37e9587a.js
main~37e9587a.css
```
如果改变 index.css 内容，只想其对应的输出改变名称，可以更改如下配置:
- 将css的命名使用 `[contenthash]`
- 为了便于对比css改变后，其它输出文件命名不变，需要把js构建输出命名改为 `[chunkhash]`
```patch
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../hash-demo'),
  entry: './index.js',
  output: {
-    path: path.resolve(__dirname, 'bundle-hash'),
-    filename: '[name]~[hash:8].js',
-    chunkFilename: '[name]~[hash:8].js',
+    path: path.resolve(__dirname, 'bundle-contenthash'),
+    filename: '[name]~[chunkhash:8].js',
+    chunkFilename: '[name]~[chunkhash:8].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
-      filename: '[name]~[hash:8].css',
+      filename: '[name]~[contenthash:8].css',
    }),
  ],
}
```
再次构建，可以看到css的构建文件的hash值已经区别于其它文件hash值了。
```
async~ec03e196.js
main~b6ba22d3.js
main~85f25b68.css
```
此时再次修改css文件内容，再构建，可以看到`main~xx.css`和`main~xx.js`文件名称改变了，`async~xx.js`文件名称未变。
```js
async~ec03e196.js
main~de34daf3.js
main~8ae5292c.css
```
此时再改变 `async.js`的内容后，再构建，可以看到 `async~xx.js`和`main~xx.js`文件名称改变了，`main~xx.css`文件名称未变。
```js
async~75a9865d.js
main~371dc869.js
main~8ae5292c.css
```

以上试验结果，基本符合预期。

但这里有个问题，为什么任一文件的改变，都会引起主入口文件 `main~xx.js`的hash值改变，理想情况不应该改变其hash值的？
### hash 值的不稳定性

1. 为什么任一文件的改变，都会引起主入口文件 `main~xx.js`的hash值改变，理想情况不应该改变其hash值的？

查看入口文件 `main~xx.js`代码，可以看到其中 webpack 注入的运行时代码中包括了依赖模块的代码：
```js
/* webpack/runtime/get javascript chunk filename */
(() => {
	// This function allow to reference async chunks
	__webpack_require__.u = (chunkId) => {
		// return url for filenames based on template
		return "" + "async" + "~" + "75a9865d" + ".js";
	};
})();
```
webpack runtime（webpackBootstrap）代码不多，主要包含几个功能：
- 全局 `webpackJsonp` 方法：模块读取函数，用来区分模块是否加载，并调用 `__webpack_require__` 函数；
- 私有 `__webpack_require__` 方法：模块初始化执行函数，并给执行过的模块做标记；
- 异步 chunk 加载函数（用 script 标签异步加载），加载的 chunk 内容均被 webpackJsonp 包裹的，script 加载成功会直接执行。这个函数还包含了所有生成的 chunks 的路径。
- 对 ES6 Modules 的默认导出（export default）做处理。

为了实现我们的目标，可以尝试把运行时代码单独抽离出来，webpack 配置文件中增加以下配置
```js
optimization: {
  runtimeChunk: {
    name: 'runtime',
  }
}
```
此时再次构建输出：
```
main~d8d7c0d9.js
main~8ae5292c.css
async~75a9865d.js
runtime~abc83c1d.js
```
此时更改async.js内容，再次构建，可以看到只有 `async~xx.js`和`runtime~xx.js`改变， `main~xx.js`和`main~xx.css`未改变；
```
main~d8d7c0d9.js
main~8ae5292c.css
async~fd3fd830.js
runtime~d80e9835.js
```
更改 index.css 内容再次构建，也是一样的效果，符合预期。


2. 生成稳定的模块 ID，避免 hash 值改变。

在项目中增加一个 `greet.js`模块：
```js
// greet.js
export default function greet(name) {
  console.log(`hello ${name}`)
}
```
修改 utils.js 文件内容
```patch
// utils.js
+import greet from './greet.js'
+greet('Tom')

export function cube(x) {
  return x * x * x;
}
```
此时依赖图：
```
    Source                  Chunk

  index.css   +--------->   main-hash:8.css

  +----------+
  | index.js |
  | utils.js +---------->   main-hash:8.js
  | greet.js |
  +----------+

  async.js  +--------->   async-hash:8.js
```
此情况下，再次构建输出，预期应该只改变 `main~xx.js`和`runtime~xx.js`文件名称，而`async~xx.js`和`main~xx.css`文件名称应该不变

```
main~8ae5292c.css
main~bc863479.js
async~ad0f03d4.js
runtime~7ddcabf1.js
```

但结果是，只有`main~8ae5292c.css`未改变名称，`async.js`的构建输出为什么会改变？

原因是 Chunk 的生成除了本身的文件内容外，还涉及到模块依赖的解析和模块 ID 分配，webpack 中 modulek.id 会默认地基于解析顺序(resolve order)顺序递增的正整数。也就是说，当解析顺序发生变化(删除一个依赖模块或增加一个依赖模块），ID 也会随之改变，这是无法稳定实质上没有变化的 chunk 文件的 chunkhash 变动问题的本源。

所以当增加或删除一个依赖模块时，重新解析获取的依赖图中的 moduleId 就改变了，所以通常 `moduleId.content` 计算的 hash 值也会改变。

解决这个问题的核心在于：**生成稳定的模块 ID**，那如何生成稳定的模块 ID？

- webpack@4.x 中可以使用`NamedModulesPlugin` 或 `HashedModuleIdsPlugin` 插件来稳定 moduleId；
- 在webpack@5.x 中可以设置 `optimization.moduleIds / optimization.chunkIds`

1. NamedModulesPlugin

这个插件模块可以将依赖模块的正整数 ID 替换为相对路径（如：将moduleId=4 替换为 moduleId=./path/to/greet.js）。

优点：
- 开发模式，它可以让 webpack-dev-server 和 HMR 进行热更新时在控制台输出模块名字而不是纯数字；
- 生产构建环境，它可以避免因修改内容导致的 ID 变化，从而实现持久化缓存。

但是有两个缺点：
- 递增 ID 替换为模块相对路径，构建出来的 chunk 会充满各种路径，使文件增大；
- 模块（npm 和自己的模块）路径会泄露，可能导致安全问题。

2. HashedModuleIdsPlugin

NamedModulesPlugin 的进阶模块，它在其基础上对模块路径进行 MD5 摘要，不仅可以实现持久化缓存，同时还避免了它引起的两个问题（文件增大，路径泄露）。因此可以轻松地实现 chunkhash 的稳定化！

3. webpack@5.x 配置 `optimization.moduleIds / optimization.chunkIds`

```js
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
},
```

我们先修改 utils.js 的内容，不引入 greet.js，然后修改配置文件
```patch
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../hash-demo'),
  entry: './index.js',
  output: {
-    path: path.resolve(__dirname, 'bundle-runtime'),
+    path: path.resolve(__dirname, 'bundle-chunkId'),
    filename: '[name]~[chunkhash:8].js',
   chunkFilename: '[name]~[chunkhash:8].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name]~[contenthash:8].css',
    }),
  ],
  optimization: {
    runtimeChunk: {
      name: 'runtime',
    },
+    moduleIds: 'deterministic',
+    chunkIds: 'deterministic',
  }
}
```
初次构建：
```
main~8ae5292c.css
main~d31dd30f.js
async~43038bd3.js
runtime~2f061f70.js
```
然后修改utils.js 文件内容，引入新增模块 greet.js，再次构建
```
main~8ae5292c.css
main~112bee88.js
async~43038bd3.js
runtime~2f061f70.js
```
符合预期，只有 `main~xx.js`的文件名称发生的改变，其它输出文件名称未变。

总结下来:
- hash: 受所有代码影响，只要有变化，hash就变了。
- chunkhash: 受到它自身chunk内容的影响，以及 chunkId moduleId 的影响。
- contenthash: 受到它自身文件内容的影响，以及 chunkId moduleId 的影响。

参考链接：
- [webpack持久化缓存优化策略](https://zhuanlan.zhihu.com/p/28208003)
- [用 webpack 实现持久化缓存](https://sebastianblade.com/using-webpack-to-achieve-long-term-cache/)
