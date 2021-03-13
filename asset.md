# Asset Module 静态资源构建

webpack 只能处理 js 文件，如果要对非 js 文件打包需要预装对应的 loader 来实现转换。

在 web 项目的构建中，常见的静态资源包括：
- 图片：.png .jpg 等
- 图标：iconfont svg-icon 等
- 字体: `/\.(woff|woff2|eot|ttf|otf)$/i`
- 配置文件: .json5 .yaml .toml 等

在处理这些静态资源时，在 webpack@4 中，通常需要使用到以下 loader 配合处理：
- raw-loader 将非js文件导入为字符串
- file-loader 将非文件发送到输出目录，并使用相对路径替换模块引用路径。即替换 import require url @import src 等引入路径。直白说就是复制文件到指定输出目录，并用新路径替换原引用路径。
- url-loader 功能类似于 file-loader, 但是在文件大小（单位为字节）低于指定的限制 limit 时，可以返回一个 DataURL，插入到引用文件内部。可以指定生成DataURL 类型，默认 base64，可选值：`["utf8","utf16le","latin1","base64","hex","ascii","binary","ucs2"]`

## webpack @4 处理

### file-loader
```css
/* index.css */
.container {
  width: 500px;
  height: 500px;
  margin: 50px auto;
  font-size: 20px;
  font-weight: 600;
}
.log {
  width: 80px;
  height: 80px;
  background: url('./webpack.svg') no-repeat;
  background-size: cover;
}
```
```js
// index.js
import './index.css'

const genElement = () => {
  const eleBox = document.createElement('div')
  eleBox.classList.add('container')
  const eleLogo = document.createElement('div')
  eleLogo.classList.add('logo')
  const eleP = document.createElement('p')
  eleP.textContent = 'Hello webpack'

  eleBox.appendChild(eleLogo)
  eleBox.appendChild(eleP)

  return eleBox
}

document.body.appendChild(genElement())
```
webpack.config.js 配置
```sh
npm i -D file-loader
```
```js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../asset-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-file'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ]
      },
      {
        test: /\.svg$/i,
        use: ['file-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ]
}
```
此时可以看到图片 `webapck.svg` 被复制到了 `bundle-file` 路径下，并且以默认的 `[contenthash].[ext]` 命名。

同时，`index.css` 文件中图片的引用地址也被替换了。
```css
/* 源文件 index.css */
.logo {
  width: 80px;
  height: 80px;
  background: url('./webpack.svg') no-repeat;
  background-size: cover;
}

/* 构建后的 css 文件 */
.logo {
  width: 80px;
  height: 80px;
  background: url(a3e3c0236318203a1a7a43f66ae97010.svg) no-repeat;
  background-size: cover;
}
```
如果需要将图片的名称不使用 hash 值，也可以自定义：
```patch
{
  test: /\.svg$/i,
-  user: ['file-loader'],
+  use: [
+    {
+      loader: 'file-loader',
+      options: {
+        name: '[name].[ext]', // 可用的变量占位符包括：[path] [name] [ext] [hash:n] [contenthash:n]
+      }
+    }
+  ]
}
```
此时再构建一次，图片输出 `webpack.svg`

### url-loader

这个 svg 图片大小是 3.7kb，并不是构建成单独文件增加一次 http 请求，希望将小文件直接内嵌到引用文件，此时可以使用 `url-loader`

`url-loader` 默认将文件尺寸小于 **8kb** 的文件以 `base64` 格式编码内嵌，等于或大于 8kb 时，默认采用 `file-loader`处理输出文件到指定目录中。

```sh
npm i -D url-loader
```
更改配置文件
```patch
output: {
-  path: path.resolve(__dirname, 'bundle-file'),
+  path: path.resolve(__dirname, 'bundle-url'),
  filename: '[name].js',
},

{
  test: /\.svg$/i,
-  use: [
-    {
-      loader: 'file-loader',
-      options: {
-        name: '[name].[ext]', // 可用的变量占位符包括：[path] [name] [ext] [hash:n] [contenthash:n]
-      }
-    }
-  ]
+  user: ['url-loader'],
}
```

此时，输出的`main.css`代码：
```css
.logo {
  width: 80px;
  height: 80px;
  background: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iM...) no-repeat; 
  background-size: cover;
}
```
在 `url-loader` 中可以自定义阀值来限制是内嵌还是复制文件，也可以指定其它编码方式，或自定义编码方案。

```js
{
  test: /\.svg$/i,
  use: [
    {
      loader: 'url-loader',
      options: {
        limit: 8092, // Boolean|Number ，false，即始终以 file-loaer 方式处理文件。如果是 nmuber，单位字节 b，默认 8092b = 8kb
        minetype: 'mimetype/svg', // 指定文件类型
        encoding: 'base64', // Boolean|String，false 关闭编码， sring 时默认 base64，其它支持编码方式："utf8","utf16le","latin1","base64","hex","ascii","binary","ucs2"
        generator: (content, mimetype, encoding, resourcePath) => String, // 命名用自定义的编码方案
        fallback: 'file-loader', // 当文件大小超过 limit 限制时，指定调用的处理程序
        esModule: true, // 使用 file-loader 时处理模块的语法规范，true 时使用 ES Module；false 时使用 CommonJS
      }
    }
  ]
}
```
对于 SVG 格式来说，应该避免使用 base64， SVG 使用特定的 dataURI 方案，可以被压缩的更小，推荐使用 mini-svg-data-uri 来压缩 SVG。

```js
const svgToMiniDataURI = require('mini-svg-data-uri');
{
  test: /\.svg$/i,
  use: [
    {
      loader: 'url-loader',
      options: {
        generator: (content) => svgToMiniDataURI(content.toString()),
      },
    },
  ],
},
```
或者直接使用处理 SVG 的 loader：`svgo-loader`

```js
{
  test: /\.svg$/i,
  use: ['url-loader', 'svgo-loader'],
},
```

## webpack @5 处理

`webpack@5` 提供了内置的静态资源构建能力，我们不需要安装额外的 loader，仅需要简单的配置就能实现静态资源的打包和分目录存放。

对应于静态资源处理的需求：
- `raw-loder` 将资源不作转换以原始内容导入为字符
- `file-loader` 将资源复制到指定路径，并以相对路径替换原始路径
- `url-loader` 设置文件大小阀值，确定文件是以 data URI 内联还是以 file-loader 复制

webpack 5 将静态资源类型分为4种：
- `asset/source`: 标记为此类型的资源将导出原始内容，替代 `raw-loader` 的处理
- `asset/resource`：标记为此类型的资源将导出一个单独的文件，并替换导入 URL，替代 `file-loader`的功能
- `asset/inline`：标记为此类型的资源将导出一个 data URI，内嵌到 bundle 中。替换 `url-loader` 功能
- `asset`：标记为此类型的资源将依据配置自动实现是导出一个 data URI 还是导出一个单独的文件。

```patch
module: {
  rules: [
    // 1. 提取单独文件
    {
      test: /\.svg$/i,
-     use: ['file-loader'],
+     type: 'asset/resource, // 单独文件
    },
    
    // 2. 内联文件
    {
      test: /\.svg$/i,
-     use: ['url-loader'],
+     type: 'asset/inline, // 以 data URI 内联
    },
    {
      test: /\.svg$/i,
-     use: ['url-loader'],
+     type: 'asset', // 同样根据默认的阀值 8kb 确定是 inline 还是 resource
    },

    // 3. 自定义文件大小阀值
    {
      test: /\.svg$/i,
-     use: [
-        {
-          loader: 'url-loader',
-          options: {
-            limit: 4 * 1024, // 阀值设为 4kb  
-          }
-        }
-     ],
+     type: 'asset',
+     parser: {
+       dataUrlCondition: {
+         maxSize: 4 * 1024, // 阀值设为 4kb  
+       }
+     }
    },

    // 4. 自定义文件编码方式和文件类型
    {
      test: /\.svg$/i,
-     use: [
-        {
-          loader: 'url-loader',
-          options: {
-            limit: 4 * 1024, // 设为 4kb
-            minetype: 'mimetype/svg', // 指定转换后文件类型
-            encoding: 'base64', // Boolean|String，false 关闭编码， sring 时默认 base64，其它支持编码方式："utf8","utf16le","latin1","base64","hex","ascii","binary","ucs2"
-          }
-        }
-     ],
+     type: 'asset', 
+     parser: {
+       dataUrlCondition: {
+         maxSize: 4 * 1024, // 阀值设为 4kb  
+       }
+     },
+     generator: {
+       dataUrl: { // dataUrl 使用对象形式配置编码方式和文件类型
+         encoding: 'base64',     // 编码方式
+         mimetype: 'mimetype/svg', // 文件类型
+       }  
+     }
+    },

    // 6. 自定义文件 dataURI 生成方案
    {
      test: /\.svg$/i,
-      use: [
-        {
-          loader: 'url-loader',
-          options: {
-            generator: (content) => svgToMiniDataURI(content.toString()), // 自定义 dataURI 生成方式
-          },
-        },
-      ],
+     generator: {
+       dataUrl: (content, { filename module} =>{ // dataUrl 使用函数方式自定义编码方案
+          if (typeof content !== 'string') {
+              content = content.toString();
+            }
+            return svgToMiniDataURI(content.toString());
+       }
+     },
    },

    // 7. 自定义文件输出名称
    {
      test: /\.svg$/i,
-      use: [
-        {
-          loader: 'file-loader',
-          options: {
-            outputPath: 'images', 
-            name: '[name].[ext][query]',
-          },
-        },
-      ],
-       {
-          loader: 'url-loader',
-          options: {
-            fallback: 'file-loader',
-            outputPath: 'images', 
-            name: '[name].[ext][query]',
-          },
-        },
-      ],
+     // webpack@5 第一种自定义资源名称方法，这种方式可以更细致到具体类型
+     generator: {
+       filename: 'images/[name][ext]', // 注意区别 ext 没有点  
+     },
    },
  ]
+    // webpack@5 第二种自定义静态资源文件名称方法，在 output 中定义，作用于所有静态资源
  output: {
    path: path.resolve(__dirname, 'bundle-url'),
    filename: '[name].js',
    chunkFilename: '[contenthash:8].js',
+   assetModuleFilename: 'images/[name][ext]',
  },
},
```

当然，webapck@5 也支持兼容模式，如果不想采用 webpack@5 这种 `asset module` 的模式，也可以设置回退成使用 `url-loader` 这类配置

```patch
module.exports = {
  module: {
    rules: [
      {
        test: /\.svg$/i,
-       type: 'asset',
+       type: 'javascript/auto',
+       use: ['url-loader'],
      }
    ]
  }
}
```
## 类 JSON 文件处理

在 webpack@5 中可以通过 `parser.parse` 属性自定义类 json 的处理器。

```json5
{
  // json5 是更接近 javascript 对象的 JSON 格式，可以注释，不用严格限制双引号等。
  title: 'JSON5 Example',
  owner: {
    name: 'Tom Preston-Werner',
    organization: 'GitHub',
    bio: 'GitHub Cofounder & CEO\n\
Likes tater tots and beer.',
    dob: '1979-05-27T07:32:00.000Z',
  },
}
```
配置：
```patch
+ const json5 = require('json5');
module.exports = {
  module: {
    rules: [
      {
        test: /\.json5$/i,
-        loader: 'json5-loader',
-        type: 'javascript/auto',
+        type: 'json',
+        parser: {
+          parse: json5.parse,
+        },
      },
    ]
  }
}
```
文件中导入即可以直接像对象一样调用
```js
import json from './data.json5';

console.log(json.title); // output `JSON5 Example`
console.log(json.owner.name); // output `Tom Preston-Werner`
```

同理，`yaml / toml` 等文件添加对应的解析器，同样可以处理成对象直接调用。

> [toml 语法](https://toml.io/cn/v1.0.0-rc.1)
> [yaml 语法]()

```patch
+ const json5 = require('json5');
+ const toml = require('toml');
+ const yaml = require('yamljs');
module.exports = {
  module: {
    rules: [
      {
        test: /\.json5$/i,
-        loader: 'json5-loader',
-        type: 'javascript/auto',
+        type: 'json',
+        parser: {
+          parse: json5.parse,
+        },
      },
+      {
+        test: /\.toml$/i,
+        type: 'json',
+        parser: {
+          parse: toml.parse,
+        },
+      },
+      {
+        test: /\.yaml$/i,
+        type: 'json',
+        parser: {
+          parse: yaml.parse,
+        },
      },
    ]
  }
}
```

```toml
title = "TOML Example"

[owner]
name = "Tom Preston-Werner"
organization = "GitHub"
bio = "GitHub Cofounder & CEO\nLikes tater tots and beer."
dob = 1979-05-27T07:32:00Z
```
```yaml
title: YAML Example
owner:
  name: Tom Preston-Werner
  organization: GitHub
  bio: |-
    GitHub Cofounder & CEO
    Likes tater tots and beer.
  dob: 1979-05-27T07:32:00.000Z
```
文件中引入
```js
import toml from './data.toml';
import yaml from './data.yaml';

console.log(toml.title); // output `TOML Example`
console.log(toml.owner.name); // output `Tom Preston-Werner`

console.log(yaml.title); // output `YAML Example`
console.log(yaml.owner.name); // output `Tom Preston-Werner`
```
