# entry 不同类型值时的构建结果

`entry`的值可以是：
- 字符串 `string`
- 字符串数组`[string]`
- 描述符对象键值对形式： `object {key: string | [string] }`

> webpack 5.x 入口文件的配置新增描述符对象形式，可以定义文件依赖、生成类库的格式类型（commonjs 或 amd），也可以设置运行时的名字，以及代码块加载的方式

现在分别对不同类型值的配置，看下打包后的 bundle 是什么样的结果。

## 字符串 string
```js
// index.js
function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'
  return eleDiv
}
document.body.appendChild(genElement())
```
```js
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: './index.js',
   output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname),
  }
}
```
此时运行：
```sh
npx webpack --config=./entry-demo/webpack.config.js
```
打出来的 `bundle.js`，跟我们直接引用 `index.js` 没有什么太多区别，只是在 `bundle.js` 中包了一层 IIFE 自执行函数。
```js
// bundle.js
(() => { // webpackBootstrap
var __webpack_exports__ = {};
function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'
  return eleDiv
}
document.body.appendChild(genElement())
})()
```
可以看到当前源码中 `index.js` 中没有任务模块依赖。现在我们添加一个模块依赖。

## 有模块依赖的情况

增加一个依赖模块 utils.js
```js
// utils.js
/**
 * 生成指定位数的随机整数
 */
exports.genRandomNumber = function(n) {
  return Math.round(Math.random() * Math.pow(10, n))
}
```
更改 index.js 代码
```patch
+const { genRandomNumber } = require('./utils.js')

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'

+  const eleBtn = document.createElement('button')
+  eleBtn.textContent = 'Click me to generate random number: 0'
+  eleBtn.onclick = function() {
+    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
+  }
+  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())
```
更改配置文件，为了便于对比，改下输出文件的命名
```patch
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: './index.js',
   output: {
-   filename: 'bundle.js', 
+   filename: 'bundle-utils.js',
    path: path.resolve(__dirname),
  }
}
```
此时输出的 bundle-utils.js 为：
- 引入的依赖模块被放在了 `__webpack_modules__` 数组中，且作为第二项元素，同样被包了一层函数，传入了模块内通用的 `module` 和 `exports`。
- 引入了webpack 运行时代码，自定义的模块加载函数`__webpack_require__`，实现了类似 node 中 `require` 函数的功能。
- 有一个全局变量 `__webpack_module_cache__` 缓存所有已加载的模块。

> 通过 __webpack_require__函数的实现，也可以理解 node 中 CommonJS 模块规范中，在一个模块中可以使用的变量 module.exports / exports 其实是 require 函数中的私有变量。
```js
(() => {
  // webpackBootstrap
  var __webpack_modules__ = [
    ,
    (__unused_webpack_module, exports) => {
      /**
       * 生成指定位数的随机整数
       */
      exports.genRandomNumber = function(n) {
        return Math.round(Math.random() * Math.pow(10, n));
      };
    },
  ];
  /************************************************************************/
  // The module cache
  var __webpack_module_cache__ = {};

  // The require function
  function __webpack_require__(moduleId) {
    // Check if module is in cache
    if (__webpack_module_cache__[moduleId]) {
      return __webpack_module_cache__[moduleId].exports;
    }
    // Create a new module (and put it into the cache)
    var module = (__webpack_module_cache__[moduleId] = {
      // no module.id needed
      // no module.loaded needed
      exports: {},
    });

    // Execute the module function
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);

    // Return the exports of the module
    return module.exports;
  }

  /************************************************************************/
  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
  (() => {
    const { genRandomNumber } = __webpack_require__(1);

    function genElement() {
      const eleDiv = document.createElement('div');
      eleDiv.textContent = 'Hello webpack';

      const eleBtn = document.createElement('button');
      eleBtn.textContent = 'Click me to generate random number: 0';
      eleBtn.onclick = function() {
        eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(
          2
        )}`;
      };
      eleDiv.appendChild(eleBtn);
      return eleDiv;
    }
    document.body.appendChild(genElement());
  })();
})();
```
其中缓存已加载模块的这段代码可以拆开来看：
```js
// Create a new module (and put it into the cache) 创建一个新的 module，同时将该模块缓存
var module = (__webpack_module_cache__[moduleId] = {
  exports: {},
});

// 相当于
var module = {
  exports: {}
}
__webpack_module_cache__[moduleId] = module

// 因为对象的引用关系，文件模块和缓存模块是同一个对象，存放在同一个物理地址。
```
## 字符串数组作为入口

假设有一个独立的模块 `green.js`
```js
globalThis.greet = function(name) {
  globalThis.alert(`Hello ${name}`)
}
```
更改下 index.js 代码
```patch
- const { genRandomNumber } = require('./utils.js')

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'

  const eleBtn = document.createElement('button')
- eleBtn.textContent = 'Click me to generate random number: 0'
- eleBtn.onclick = function() {
-   eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
- }
+  eleBtn.textContent = 'Click me to greet Tom'
+  eleBtn.onclick = function() {
+     globalThis.greet('Tom') // 全局变量使用  
+   }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())
```
更改配置文件 entry 值为数组形式
```patch
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
-  entry: './index.js',
+  entry: ['./greet.js', './index.js'],
   output: {
-   filename: 'bundle-utils.js',
+   filename: 'bundle-greet.js', 
    path: path.resolve(__dirname),
  }
}
```
此时我们看下 `greet.js` 文件是如何被构建的
```js
// bundle-greet.js
(() => {
  // webpackBootstrap
  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be isolated against other entry modules.
  (() => {
    globalThis.greet = function(name) {
      globalThis.alert(`Hello ${name}`);
    };
  })();

  // This entry need to be wrapped in an IIFE because it need to be isolated against other entry modules.
  (() => {
    function genElement() {
      const eleDiv = document.createElement('div');
      eleDiv.textContent = 'Hello webpack';

      const eleBtn = document.createElement('button');
      eleBtn.textContent = 'Click me to greet Tom';
      eleBtn.onclick = function() {
        globalThis.greet('Tom');
      };
      eleDiv.appendChild(eleBtn);

      return eleDiv;
    }
    document.body.appendChild(genElement());
  })();
})();

// 与最初的 bundle.js 对比，多了直接注入的 greet,js 的代码
(() => {
  // webpackBootstrap
  var __webpack_exports__ = {};
  function genElement() {
    const eleDiv = document.createElement('div');
    eleDiv.textContent = 'Hello webpack';
    return eleDiv;
  }
  document.body.appendChild(genElement());
})();
```
跟最初的 `bundle.js` 的区别很明显，如果`entry`配置成数组形式，则会将数组中除最后一项外的模块代码直接注入到全局代码中，然后再以最后一项为入口进行打包构建。

所以如果要将 `entry`配置成数组形式，一般为一些可独立使用的没有依赖的单独模块，如 `jQuery / lodash` 这些。

对一些大型依赖的独立模块，如果用`entry` 配置成数组形式
```js
entry: ['jQuery', 'lodash', './index.js']
```
因为注入的代码，必须使得最终的 bundle.js 特别大。此时可以采用描述符对象形式提取出独立模块。

> 所以一般entry 配置数组形式是非常少的
## 描述符对象形式：分离独立模块

更改配置文件
```patch
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
-   entry: ['./greet.js', './index.js'],
+   entry: {
+     index: './index.js',
+     greet: './greet.js', 
+   },
    output: {
-   filename: 'bundle-greet.js', 
-    path: path.resolve(__dirname),
+   filename: '[name].bundle.js',
+   path: path.resolve(__dirname, 'bundle-object'),
  }
}
```
此时需要更改`index.html`引入两个 js 文件
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Counter</title>
</head>
<body>
  <!-- <script src="./bundle.js"></script> -->
  <!-- <script src="./bundle-utils.js"></script> -->
  <!-- <script src="./bundle-greet.js"></script> -->
  <script src="./bundle-object/greet.bundle.js"></script>
  <script src="./bundle-object/index.bundle.js"></script>
</body>
</html>
```

如果在将存在依赖关系的两个模块分离成两个 bundle，也可以在入口里更改设置。

## 描述符对象形式：分离有依赖关系的模块

以上一个 utils.js 为例，更改配置文件
```js
// TODO： 下面是迭代案例，待后续更新
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: {
    index: {
      import: './index.js',
      dependOn: 'utils',
    },
    utils: './utils.js',
  },
  output: {
    path: path.resolve(__dirname, 'bundle-depend'),
    filename: '[name].bundle.js',
  },
}
```

## 描述符对象形式，定义输出文件名
```js
// TODO: 失败，构建出的 [ext] 无法识别
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: {
    index: {
      import: './index.js',
      filename: '[name][ext]',
    },
    greet: {
      import: './greet.js',
      filename: '[name][ext]',
    }
  },
  output: {
    path: path.resolve(__dirname, 'bundle-entry-descriptor'),
  }
}
```
