# HTML 自动注入

像前面案例，每次构建完成后的 `bundle` 都要手动更新到 `index.html` 文件中。如果在真实项目打包构建中开启了缓存，即 hash 命名，那这种的替换工具就更麻烦了。如果打出包多个 bundle，加上 css 等静态资源的引入，手动在 `index.html`注入资源几乎不可能。

所以需要使用 `html-webpack-plugin` 插件自动帮我们完成以上工作。

## 基本使用
```sh
# 下载安装插件
npm install --save-dev html-webpack-plugin
```
更新配置
```js
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  context: '
  entry: 'index.js',
  output: {
    path: __dirname + '/',
    filename: '[name]@[hash:8].js'
  },
  plugins: [
    new HtmlWebpackPlugin()
  ]
}
```
此时项目中都可以不用创建 `index.html` 文件，`html-webpack-plugin` 会使用内置的默认模块来生成已经注入了依赖资源的 `index.html`。输出结果如下：
> 对于 js 文件，默认插入到 head 标签中，并添加 defer 属性，表示延迟加载，即在HTML加载渲染完成后加载 js
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Webpack App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script defer src="main%40432e7ac5.js"></script>
  </head>
  <body>
  </body>
</html>
```

关于 `HtmlWebpackPlugin` 插件，我们需要了解以下内容：
- `options` 实例化时传入的自定义配置项
- 自定义模板 html 文件中可用的参数变量包括：
  - `htmlwebpackPlugin` 实例对象
  - `webpackConfig` 当前 webpack 打包构建的实际配置，包含自定义 `webpack.config.js`中的选项，和 webpack 自行注入的相关配置选项。
  - `compilation` 当前构建的实例对象，可用于获取构建过程中相关源或事件。
- `HtmlWebpackPlugin` 插件提供的钩子函数

可以通过配置一个模板文件`index-template.ejs`打印上述对象：
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Html webpack plugin</title>
</head>
<body>
  <%= JSON.stringify(htmlWebpackPlugin) %>
  <hr>
  <%= JSON.stringify(webpackConfig) %> 
</body>
</html>
```
配置文件
```js
plugins: [
  new HtmlWebpackPlugin({
    template: './index-template.ejs',
  })
]
```
整理成 js 文件
```js
const htmlWebpackPlugin = {
  tags: {
    headTags: [
      {
        tagName: 'script',
        voidTag: false,
        meta: { plugin: 'html-webpack-plugin' },
        attributes: { defer: true, src: 'main%407d2eac7c.js' },
      },
    ],
    bodyTags: [],
  },
  files: { 
    publicPath: '', 
    js: ['main%407d2eac7c.js'], 
    css: [],
    manifest: '',
    favicon: '',
  },
  options: {
    template:
      'E:\\develop\\learn-webpack\\node_modules\\html-webpack-plugin\\lib\\loader.js!E:\\develop\\learn-webpack\\html-demo\\index-template.ejs',
    templateContent: false,
    filename: 'index.html',
    publicPath: 'auto',
    hash: false,
    inject: 'head',
    scriptLoading: 'defer',
    compile: true,
    favicon: false,
    minify: 'auto',
    cache: true,
    showErrors: true,
    chunks: 'all',
    excludeChunks: [],
    chunksSortMode: 'auto',
    meta: {},
    base: false,
    title: 'Webpack App',
    xhtml: false,
  },
};

const webpackConfig = {// 内容较多，这里省略}
```

这里主要看下 `htmlWebpackPlugin` 实例对象可用的三个属性：
- tags: `headTags / bodyTags`，保存了插件渲染到 html 上所有的标签元素对象。
- files: 保存了插件最终需要插入到 html 中的资源文件，即 webpack 最终打包的结果文件
- options: 插件最终配置的选项对象，由插件实例化时用户传入的配置和内部默认的配置合并而成。

## 配置选项 optionss

在 `new HtmlWebpackPlugin()`时，我们也可以传入自定义的配置参数：
```js
plugins:[
  new htmlWebpackPlugin({
    filename:'index.html',
    template:'template.html', 
    inject: true,
    title:'webpack good',
    chunks:['main']
  })
]
```
配置对象 `options` 具体有哪些可自定义配置的参数

|  参数 |  类型 |  默认值 | 描述 |
| :---: | :---: | :----: | -----|
| filename | `{String|Function}` | `index.html` | 将生成的HTML写入到该文件中。默认写入到index.html中。你也可以在这儿指定子目录 (eg: assets/admin.html) |
| publicPath | `{String|'auto'}` | `auto` | 指定注入资源的公共路径 |
| title | `{String}` | `Webpack App` | 用于生成的HTML文档标题 |
| favicon | `{String}` | `''` | 添加指定的 favicon 文件路径输出到 html文件 |
| meta | `{Object}` | `{}` | 自定义 meta 标签内容输出到 html 文件 |
| base | `{Object|String|false}` | `false` | 自定义 base 标签内容输出到 html 文件 |
| inject | `{Boolean|String}` | `true` | 指定js资源注入html的位置，可用的值：`true || 'head' || 'body' || false`<br>。'body'所有javascript资源都将放置在body元素的底部。<br>'head'会将脚本放置在head元素中。<br>通过true将根据`scriptLoading`选项将其添加到head或者body。<br>通过false将禁用自动注射 |
| scriptLoading | `{'blocking'|'defer'}` | `defer` | 指定 js 资源加载的方式，配合 `inject:true`使用。<br> defer 会使用非阻塞的方式加载js，提高首次渲染性能。 |
| hash | `{Boolean}` | `false` | 为所有注入到 html 文件的资源 chunk 添加本次构建产生的 hash 值，但一般设为 false，js 在 output.filename 使用变量占位符自定义，css 在提取插件中命名 |
| template | `{String}` | `` | 自定义html 模板，支持 ejs 格式，如果需要使用其它格式，如 pug，需要配合 pug-loader。插件提供了一个默认模板 default_index.ejs |
| templateContent | `{string|Function|false}` | `false` | 使用内联方式直接将模块定义在配置对象中，与 template 属性二选一，不能同时使用 |
| templateParameters | `{Boolean|Object|Function}` | `false` | 自定义模板可以使用的参数。插件默认提供了 `htmlWebpackPlgin / webpackConfig / compilation` 参数，也可以通过此对象传入自定义变量 |
| cache | `{Boolean}` | `true` | 缓存生成的 html 文件，只有当依赖资源变化时才重新生成  |
| chunks | `{Array.<string>}` | `''` | 允许指定哪些 chunk 注入到 html 文件中 |
| excludeChunks | `{Array.<string>}` | `''` | 允许排除一些注入的资源 |
| chunksSortMode | `{String|Function}` | `auto` | 可用值：`'none' | 'auto' | 'manual' | {Function}`，用于将注入 html 的 chunk 进行排序  |
| showErrors | `{Boolean}` | `true` | 将插件运行过程中的错误信息直接写入 html 页面中 |
| minify | `{Boolean|Object}` | `mode:production`时`true`,否则为`false` | 内部使用 `html-minifier`压缩输出的html文件,所以也可以传入它的配置对象 |
| xhtml | `{Boolean}` | `false` | 如果true 将link标签呈现为自动关闭状态（符合XHTML规范） |

### 基本类属性

```js
plugins:[
  new htmlWebpackPlugin({
    filename:'index.html',
    title: 'options', // <title>Html webpack plugin</title>
    favicon: '.path/to/favicon.ico', // <link rel="shortcut icon" href="example.ico">
    base: 'https://www.example.com/', // <base href="https://www.example.com/">
    base: { // <base target="_top" href="https://example.com/">
      href: 'https://www.example.com/',
      target: '_top',
    }
    meta: {
      viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no', // <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      'X-UA-Compatible': {'http-equiv': "X-UA-Compatible", 'content'="IE=edge"}, // <meta http-equiv="X-UA-Compatible" content="IE=edge">
    }
  })
]
```

## js 资源注入位置和加载方式
```js
plugins:[
  new htmlWebpackPlugin({
    inject: 'head', // script 标签放置在 head 标签内。<head><script></script><head>
    inject: 'body', // script 标签放置在 body 标签底部。 <body>其它内容；<script></script></body>
    inject: false, // 不插入生成的 js 资源的 bundle文件，只是单纯的生成一个 html 文件，需要手动在 template 文件中利用 htmlWebpckPlugin 的 api 处理资源注入
    inject: true, // 根据 scriptLoading 的值决定script 插入位置。blocking 时插入到 body 底部，defer 时插入 head 标签内，并且 script 标签添加 defer 属性。
    scriptLoading: 'blocking', // <body>其它内容；<script></script></body>
    scriptLoading: 'defer', // <head><script defer src="main%407d2eac7c.js"></script></head>
  })
]
```

## 自定义 html 模板

### 默认模板 defult_index.ejs

`HtmlWebpackPlugin`默认有一个模板文件`defult_index.ejs`
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title><%= htmlWebpackPlugin.options.title %></title>
  </head>
  <body>
  </body>
</html>
```

### templateContent

也可以通过外部传入自定义的模板，如果是简单模板可以直接使用 `templateContent` 属性定义
```js
plugins: [
  new HtmlWebpackPlugin({
    templateContent: `
      <html>
        <body>
          <h1>Hello HTMl Plugin by templateContent</h1>
        </body>
      </html>
    `
  })
]
```
也可以赋值一个函数，这样这可以使用模板参数 `htmlWebpackPlugin / webapckConfig` 或自定义传入 `templateParameters` 的值
```js
new HtmlWebpackPlugin({
  inject: false, // 手动处理资源的插入
  templateParameters: {
    custom: 'custom_value',
  },
  templateContent: ({htmlWebpackPlugin, custom}) => `
    <html>
      <head>
        ${htmlWebpackPlugin.tags.headTags}
      </head>
      <body>
        <h1>Hello World</h1>
        ${JSON.stringify(htmlWebpackPlugin)}
        ${custom}
      </body>
    </html>
  `
})
```

### template

如果是复杂的模板定义，或者使用非 ejs 模板，可以使用 template 属性指定一个模板文件。

```js
new HtmlWebpackPlugin({
  template: './index-template.ejs',
  templateParameters: {
    custom: 'custom_value',
  }
})
```
使用 `handlebars.js` 来解析模板文件，则需要安装和配置 `handlebars-loader`。
```js
module: {
  rules: [
    { test: /\.hbs$/, loader: "handlebars-loader" }
  ]
},
plugins: [
  new HtmlWebpackPlugin({
    title: 'Custom template using Handlebars',
    template: 'index.hbs'
  })
]
```
同理，在模板中插入默认会传入模板参数可以使用`htmlWebpackPlugin / webapckConfig` 或自定义传入 `templateParameters` 的值

```js
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Html webpack plugin</title>
</head>
<body>
  <%= JSON.stringify(htmlWebpackPlugin) %>
  <hr>
  <%= JSON.stringify(custom) %> 
</body>
</html>
```

### templateParameters

向模板中添加额外的参数变量。

```js
new HtmlWebpackPlugin({
  template: './index-template.ejs',
  templateParameters: {
    custom: 'custom_value',
  }
})
```
模板中可以直接使用 `custom` 的值：
```html
<body>
  <%= JSON.stringify(htmlWebpackPlugin) %>
  <hr>
  <%= JSON.stringify(custom) %> 
</body>
```

## 依赖资源 chunk 的选择

`chunks` 选项的作用主要是针对多入口(entry)文件。

如果多个入口文件的时候，对应就会产生多个编译后的 bundle 文件。那么 `chunks` 选项就可以决定当前 html 文件中注入哪些 bundle 文件。

`chunks` 默认值将所有 bundle 注入到 html 文件中。当然我们也可以指定引入哪些特定的文件。

```js
// webpack.config.js
entry: {
  index: path.resolve(__dirname, './src/index.js'),
  index1: path.resolve(__dirname, './src/index1.js'),
  index2: path.resolve(__dirname, './src/index2.js')
}
...
plugins: [
  new HtmlWebpackPlugin({
    filename: 'index_multi.html',
    chunks: ['index','index1']
  }),
  new HtmlWebpackPlugin({
    filename: 'index_single.html',
    chunks: ['index2']
  })
]
```
这样的结果就是:
- `index_multi.html` 文件中引入了两个 js
```html
<head>
  <title>index multi</title>
  <script defer src=index.js></script>
  <script defer src=index1.js></script>
</head>
```
- `index_single.html` 文件引入了一个 js
```html
<head>
  <title>index multi</title>
  <script defer src=index2.js></script>
</head>
```

因为插件默认是引入全部 bundle ，`chunk`属性可以指定引入哪些资源，同样 `excludeChunks`属性可以指定排除哪些。

```js
plugins: [
  new HtmlWebpackPlugin({
    filename: 'index_multi.html',
    // chunks: ['index','index1'],
    excludeChunks: ['index2'],
  }),
  new HtmlWebpackPlugin({
    filename: 'index_single.html',
    // chunks: ['index2'],
    excludeChunks: ['index','index1'],
  })
]
```

## 压缩最终的 html 文件

`minify` 指定是对 html 文件进行压缩的选项，默认值是当 `mode:production`时为`true`，否则为`false`。

内部使用 `html-minifier-terser` 压缩输出的 html 文件，所以也可以传入它的配置对象

```js
plugins: [
  new HtmlWebpackPlugin({
    minify: { // 下面选项是当 minify: true 时的默认值
      collapseWhitespace: true, // 移除空格
      keepClosingSlash: true, // 在自闭合元素上保留斜线 <br />
      removeComments: true, // 去除注释
      removeRedundantAttributes: true, // 	当值与默认值匹配时，删除属性。
      removeScriptTypeAttributes: true, // 移除 script 标签的 type=text/javascript 属性
      removeStyleLinkTypeAttributes: true, // 移除 link 标签的 type=text/css 属性
      useShortDoctype: true, // 使用 html5 标准的 <!DOCTYPE html>
    }
  })
]
```
其它配置的属性见 [html-minifier-terser](https://github.com/terser/html-minifier-terser)
```js
minify: {
  removeEmptyAttributes: true, // 删除所有带有仅空格值的属性
}
```

## 其它

`hash` 选项的作用是给插入的资源文件添加 webpack 本次构建的 hash 值。默认值为 false 。
```js
plugins: [
  new HtmlWebpackPlugin({
    hash: true
  })
]
```
```html
<script type=text/javascript src=bundle.js?22b9692e22e7be37b57e></script>
```
bundle.js 文件后跟的一串 hash 值就是此次 webpack 编译对应的 hash 值。
```js
Hash: 22b9692e22e7be37b57e
Version: webpack 5.24.2
```

但是一般保留默认值 `false`，js 资源在 output.filename 使用变量占位符自定义，css 在提取插件 `min-css-extrat-plugin` 中同样使用变量占位符命名中添加 hash 值。

```js
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../html-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-options'),
    filename: '[name]@[hash:8].js', // 添加 8 位 hash 值
    chunkFilename: '[name]@[chunkHash:8].js',
    assetModuleFilename: '[name]@[chunkHash:8][ext]',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      hash: false, // 默认值即 false
    }),
    new MinCssExtractPlugin({
      filename: '[name]@[contentHash:8].css',
      chunkFilename: '[id]@[contentHash:8].css',
    })
  ]
}
```

`cache`: 默认值是 true。表示只有在内容变化时才生成一个新的文件。

`showErrors`: 默认值为 true, 显示错误信息。如果 webpack 编译出现错误，webpack会将错误信息包裹在一个 pre 标签内。
