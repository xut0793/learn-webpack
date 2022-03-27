# 开发环境构建

1. 基本功能：自动构建 watch / 开发服务器 自动刷新 / 热模块替换 / 跨域代理 / source-map  / DefinePlugin 自定义全局变量 / 环境区分
1. 优化构建速度和热更新速度: 增量构建（缓存）/ 多进程

## watch

webpack 可以监听文件变化，当它们修改后会重新编译，在配置文件中开启 `watch: true` 即可。

> 这里 watch: true 开启监听，那 webpack 监听的是那些文件的变化呢？监听的是从 entry 入口开始完成解析的依赖图中的所有文件，其中的文件一旦变化，就会触发重新打包构建。

```js
module.exports = {
  mode: 'development',

  // 启用 Watch 模式。这意味着在初始构建之后，webpack 将继续监听任何已解析的依赖图中文件的更改。
  watch: true,
  watchOptions: {
    // 理论上，监听到每一个文件更改，都会触发 webpack 重新构建。但这样频繁的构建并不需要。
    // 所以，可以通过设置此属性来设置构建的延迟时间。
    // 当第一个文件更改，会在重新构建前增加延迟。这个选项允许 webpack 将这段时间内进行的任何其他更改都聚合到一次重新构建里。以毫秒为单位
    aggregateTimeout: 200,

    // 监听大量文件会导致大量的 CPU 或内存占用。可以使用正则或者glob模式排除不需要监听的文件，像 node_modules 这类文件夹
    ignored: /node_modules/,
    ignored: '**/node_modules',
    ignored: ['**/files/**/*.js', '**/node_modules'],

    // 设置检查文件变动的轮询时间，单位毫秒；设为 true 时以默认时间 1s 开启轮询。
    poll: 1000,

  }
};
```

watch 虽然能监听文件变化触发 webpack 重新构建，但是为了看到构建结果，仍需要手动刷新浏览器才能预览最新构建效果。为了能实现自动刷新，可以通过增加 `devServer` 属性来使用 `webpack-dev-server`。
## webpack-dev-server

从 `webpack@5.x` 和 `webpack-cli@4.X` 都进行了大版本的更新
- 比如 webpack团队将`webpack-dev-server`的命令改为了`webpack serve` 。
- 在之前 webpack、webpack-cli、webpack-dev-server 都是根据模块路径跨库调用。所以只要某个库文件结构稍微改动，就会像webpack-dev-server命令这样直接报错。 不过在新版本代码进行了优化，通过约定名称进行跨库调用。尽可能降低了耦合度。
- 相对于`webpack-dev-server@3.X`，`webpack-dev-server@4.0.0beta.0`版本对配置属性做了更好的整合，比如 `proxy / static / dev / client` 的划分。

> webpack-dev-server 和 webpack-dev-middleware 里 Watch 模式默认开启。

```json
"scripts": {
"start": "webpack serve",
}
```
```js
// webpack-dev-server@4.0.0-beta.2 与 webpack-dev-server@3.x 配置项结构有很大的不同。
module.exports = {
  mode: 'development',
  devServer:{
    //  服务器host，默认为localhost，
    host: '127.0.0.1',

    //  服务器端口号，
    //  默认为8080
    port: 7777,

    //  string | boolean
    //  启动后是否打开浏览器
    //  默认为false，如果设置为true， 启动时会自动打开浏览器
    //  当为字符串时，打开指定浏览器
    open: true, // 'chrome'

    // 打开浏览器后默认打开的页面
    //  string | Array<string>
    //  当设置为Array时，会打开多个页面
    openPage: '', // ['', 'index.html'], //'index.html',

    //  是否启用gzip压缩,
    //  默认为false
    compress: true,

    //  是否启动热更新（HMR）
    //  默认为false，
    //  热更新使用的是webpack中HotModuleReplacementPlugin
    hot: true,

    //  设置允许访问的IP地址，设置为true，则不允许任何IP访问，
    //  也可以设置为数组，与webpack-devser@3.X 的allowedHosts一样
    //  此属性相当于webpack-devser@3.X 的allowedHosts属性
    firewall: true,

    //  是否设置HTTP/2服务器。
    //  对于nodeV10以上的版本  由于spdy有问题
    //  所以如果将此属性设置为true，则默认使用https作为服务
    http2: false,

    // // 是否使用https安全连接
    // //  boolean 或者 object
    // // 当为object时，可以设置安全证书
    // //  默认为false，但是当开启http2属性时，会默认使用https    默认情况下， dev-server使用HTTPS为HTTP/2提供服务
    https: {
      //  证书，证书属性也可以设置在devServer下，当https设置为boolean时， 与https同级设置
      key: '',//fs.readFileSync('/path/to/server.key'),
      cert: '',//fs.readFileSync('/path/to/server.crt'),
      ca: '',//fs.readFileSync('/path/to/ca.pem'),
    },


    //  服务器代理配置，当前后端分离开发时，前端请求API需要指定地址
    //  此属性可以设置代理的IP地址
    //  例如如下，当api请求  /api/user真实地址为http://localhost:3000/user
    //  详情使用请参考官网https://webpack.js.org/configuration/dev-server/#devserverproxy
    proxy: {
      '/api':{
        target: 'http://localhost:3000',
        //  pathRewrite属性可以设置前缀，如果不设置pathRewrite： /api/user真实地址为http://localhost:3000/api/user
        pathRewrite: {'^/api' : ''},
        //  HTTPS设置为无效证书
        // secure: false
      }
    },

    //  服务器返回时加入的response的自定义header
    headers: {
      'X-Custom-Foo': 'bar'
    },

    //  静态文件属性
    //  此属性是对webpack-devser@3.X某些属性的汇总
    static: {
      //  要挂载在服务器上静态文件的本地目录
      //  默认为为当前工作目录
      //  建议使用绝对地址
      //  例如设置为 /assets后， 会加载使用本地/assets目录下的静态文件到服务器
      //   相当于webpack-dev-server@3.X的 contentBase属性
      directory: path.join(config.root),

      //    挂载到服务器中间件的可访问虚拟地址
      //    例如设置为/static，在访问服务器静态文件时，就需要使用/static前缀
      //   相当于webpack-dev-server@3.X的 contentBasePublicPath属性
      publicPath: '/',

      //   设置挂在静态文件时使用的参数
      //   相当于webpack-dev-server@3.X的 staticOptions属性
      staticOptions: undefined,

      //  是否加入serve-index中间件，默认为true
      //   相当于webpack-dev-server@3.X的  //  是否可以在浏览器访问静态文件列表。
      //  默认为true，webpack-dev-server使用的是serve-index中间件实现这一功能
      //   相当于webpack-dev-server@3.X的 serveIndex属性
      serveIndex: true,

      //  是否使用chokidar库进行监听静态文件变化。
      //  webpack使用的是文件系统的的变化通知，但是有时候可能会不管用，例如使用网络文件系统
      //  所以可以设置属性使用chokidar库进行轮询检测文件变化。
      //  此属性可以设置为boolean类型也可以设置为对象类型指定轮询时间(毫秒数）
      //  相当于webpack-dev-server@3.X的 watchOptions属性
      watch: {
        poll: 3000
      },
    },

    // webpack-dev-middleware中间件使用的属性
    dev:{

      //  设置服务器response加入的自定义header信息
      //  此属性在webpack-dev-middleware中间件使用
      headers:{
        //  响应头添加数据
        'X-Dev-Header': 'X-Dev-Header',
        serverSideRender: false,
      },

      //   设置webpack-dev-middleware中间件的mimeTypes
      //   相当于webpack-dev-server@3.X的 mimeTypes属性
      //   相当于webpack-dev-server@3.X的 mimeTypes属性
      mimeTypes:{

      },

      //  是否将打包结果写入到磁盘之中
      //  默认为false
      //  相当于webpack-dev-server@3.X的 writeToDisk属性
      writeToDisk: false,

      // 设置打包文件存储的目录地址。此属性由webpack-dev-middleware设置
      // 例如当设置为/public,那么访问服务器所有信息都需要加入/public前缀
      // 相当于webpack-dev-server@3.X的 publicPath属性
      publicPath: '/',

      //  设置根目录所指向的页面。
      //  例如localhost:8080可以直接访问到index.html是因为默认值为index.html
      //  默认值也是index.html
      //  相当于webpack-dev-server@3.X的 index属性
      index: 'index.html',

      //  none" | "summary" | "errors-only" | "errors-warnings" | "minimal" | "normal" | "detailed" | "verbose" | boolean | object { … }
      //   设置打包文件日志输出级别，会输出在服务器终端
      //   相当于webpack-dev-server@3.X的 stats属性
      stats: 'minimal',

      //  自定义打包文件的输出流
      //  默认情况下，输入流为memory
      outputFileSystem: undefined,


      methods: undefined,

      serverSideRender: undefined

    },

    //  设置WebSocket客户端的一些属性
    client: {
        
      //  推送客户端日志级别，
      //  属性具有 "none" | "error" | "warn" | "info" | "log" | "verbose"
      //  例如设置error ，WS并不是推送打包警告和消息， WS客户端会将日志打印在控制台上
      //  如果设置为none， 就算打包失败也不会有消息
      //   相当于webpack-dev-server@3.X的 clientLogLevel属性
      logging: 'verbose',
        
      //   是否在浏览器控制台打印打包进度，
      //   相当于webpack-dev-server@3.X的 progress属性
      progress: false,

      //  相当于webpack-dev-server@3.X的 sockPath属性
      // path: '',
      //  相当于webpack-dev-server@3.X的 sockHost属性
      // host: '',
      //  相当于webpack-dev-server@3.X的 sockPort属性
      // port: '',
    },

    //  设置编译出错或警告后，页面是否会直接显示信息， boolean | {}
    //  默认为false，当失败后会显示空白页
    //  设置为true后，编译失败会显示错误/警告的覆盖层,也可以设置为object，显示多种类型信息
    overlay: {
      warning:true,
      errors: true
    },

    public: undefined,

    // 是否要注入WebSocket客户端。也就是是否要进行长链接通讯
    // boolean | function (compilerConfig) => boolean
    //  将此属性设置为false，那么hot、overlay等功能都会失效
    //  默认为true，  有兴趣的诸君可以设置为false测试一下
    injectClient: true,

    //  是否注入HMR， 这个属性是injectClient的子集。只影响热更新
    injectHot: true,

    //	是否开启自动刷新浏览器功能
    //	此属性优先级低于hot
    liveReload: false,

    //  是否开启ZeroConf网络
    **bonjour**: false,
    
    //  是否将所有404页面都跳转到index.html
    //  boolean | object
    //  当此属性设置为true或为object时并且使用HTML5 API时 所有404页面会跳转到index.html
    //  使用的connect-history-api-fallback库 设置为对象，则会将此对象传参给connect-history-api-fallback库
    historyApiFallback: false,
      
    //  是否使用局域网IP打开页面
    useLocalIp: false,
    
    //  是否监听node中stdin.end事件， 关闭服务器
    stdin: false,

    //  终止信号，设置为true时 监听['SIGINT', 'SIGTERM'];事件，事件触发后结束进程
    //  目前dev-server强制将此属性设置为true了，所以改为false不管用。
    setupExitSignals: true,

    //  设置WebSocket
    //  可以设置使用的WebSocket库。内置的库为sockjs和ws
    //  还可以自定义设置WebSocket Server和WebSocket Client
    transportMode:{
      //  设置使用的WebSocket， 值为 sockjs或者ws
      //  sockjs 使用的sockjs库
      //  ws 使用的ws库
      //  webpack-dev-server@4.X使用的是WS  webpack-dev-server@3.X 使用的是sockjs
      //  目前在webpack-dev-server@4.X使用sockjs会出错， webpack-dev-server@3.X使用WS也会报错
        server: 'ws'
    },

    //  自定义中间件钩子属性
    //  优先于server内部中间件执行
    //  相当于webpack-devser@3.X 的before函数
    onBeforeSetupMiddleware: (app, server, compiler) =>{
      //console.log('我是before', compiler.options)
    },

    //  server内部执行完所有中间件后执行当前中间件
    //  相当于webpack-devser@3.X 的after函数
    onAfterSetupMiddleware: (app, server, compiler) =>{
    },

    //  dev-server提供的当服务器启动后执行的钩子函数
    onListening: (server) => {
      // const port = server.listeningApp.address().port;
      // console.log('Listening on port:', port);
    },
  },
}
```

## DefinePlugin

`DefinePlugin` 允许创建一个在编译时可以配置的全局常量。定义的常量可以在webpack打包范围内任意javascript环境内访问。

::: warning
这个插件直接执行文本替换，给定的值必须包含字符串本身内的实际引号。所以通常，有两种方式来达到这个效果：
- 使用 '"production"'
- 或者使用 JSON.stringify('production')
:::

用法：

每个传进 DefinePlugin 的键值都是一个标志符或者多个用 . 连接起来的标志符。

- 如果这个值是一个字符串，它会被当作一个代码片段来使用。
- 如果这个值不是字符串，它会被转化为字符串(包括函数)。
- 如果这个值是一个对象，它所有的 key 会被同样的方式定义。
- 如果在一个 key 前面加了 typeof,它会被定义为 typeof 调用。

```js
new webpack.DefinePlugin({
  PRODUCTION: JSON.stringify(true),
  VERSION: JSON.stringify("5fa3b9"),
  BROWSER_SUPPORTS_HTML5: true,
  TWO: "1+1",
  "typeof window": JSON.stringify("object")
})
```
使用：
```js
if (!PRODUCTION) {
  console.log('Debug info')
}

if (PRODUCTION) {
  console.log('Production log')
}
```
webpack 编译模块后的结果：
```js
if (!true) {
  console.log('Debug info')
}
if (true) {
  console.log('Production log')
}
```

解析入参的源码：
```js
/**
  * Walk definitions
  * @param {Object} definitions Definitions map 即 new webpack.DefinePlugin(definitions)
  * @param {string} prefix Prefix string
  * @returns {void}
  */
const walkDefinitionsForValues = (definitions, prefix) => {
  Object.keys(definitions).forEach(key => {
    const code = definitions[key];
    const version = toCacheVersion(code); // 序列化 value 的值，基本转为 String，即 '"PRODUCTION"'
    const name = VALUE_DEP_PREFIX + prefix + key; // webpack/DefinePluginPRODUCTION

    // 省略代码...
    if (
      code &&
      typeof code === "object" &&
      !(code instanceof RuntimeValue) &&
      !(code instanceof RegExp)
    ) {
      walkDefinitionsForValues(code, prefix + key + ".");
    }
  });
};

walkDefinitionsForValues(definitions, "");


const toCacheVersion = code => {
	if (code === null) {
		return "null";
	}
	if (code === undefined) {
		return "undefined";
	}
	if (Object.is(code, -0)) {
		return "-0";
	}
	if (code instanceof RuntimeValue) {
		return code.getCacheVersion();
	}
	if (code instanceof RegExp && code.toString) {
		return code.toString();
	}
	if (typeof code === "function" && code.toString) {
		return "(" + code.toString() + ")";
	}
  /**
   * new webpack.DefinePlugin({
   *  OBJECT: {
   *    foo: 'bar',
   *    test: 'test',
   *  }
   * })
   * 
   * 处理为：
   * OBJECT: "foo: 'bar', test: 'test'"
   */
	if (typeof code === "object") {
		const items = Object.keys(code).map(key => ({
			key,
			value: toCacheVersion(code[key])
		}));
		if (items.some(({ value }) => value === undefined)) return undefined;
		return `{${items.map(({ key, value }) => `${key}: ${value}`).join(", ")}}`;
	}
	if (typeof code === "bigint") {
		return `${code}n`;
	}
	return code + "";
};
```
## 环境区分

见 `env.md` 文档