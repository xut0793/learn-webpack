/**
 * const server = new Server(compiler, options);
 * 以下代码会省略一些非主流程的代码。完整代码请至官方库查看
 *  webpack-dev-server/lib/Server.js
 */
class Server {
  constructor(compiler, options = {}, _log) {
    // 1. 校验 webpack.config.js 中 devServer 传入的选项以及内部默认选项合并后的 options 的格式及值的正确性
    // 像此类 xx.config.js 有很多配置选项的结构化json数据校验都利用了 schema-utils 依赖包
    // 在校验过程有如果某些参数值或结构不对，就直接报错，按 schema 定义的文本提示。
    validateOptions(schema, options, 'webpack Dev Server')

    this.compiler = compiler
    this.options = options
    this.log = _log || createLogger(options)

    // 2. 序列化 devServer 选项，主要是 contentBase contenBasePublicPath transportMode watchOptions 选项的设置
    normalizeOptions(this.compiler, this.options)

    // 3. 主要两件事：
    // 3.1 判断是否添加了 HotModuleReplacementPlugin 插件，如果没有，添加热更新插件
    // 3.2 addEntries 添加打包的入口文件，将热更新 hot/dev-server，以及 webSock 的客户端代码构建在 bundle 中，在浏览器运行
    updateCompiler(this.compiler, this.options)

    this.heartbeatInterval = 30000
    // this.SocketServerImplementation is a class, so it must be instantiated before use
    this.socketServerImplementation = getSocketServerImplementation(
      this.options
    )

    this.originalStats =
      this.options.stats && Object.keys(this.options.stats).length
        ? this.options.stats
        : {}

    this.sockets = []
    this.contentBaseWatchers = []

    // TODO this.<property> is deprecated (remove them in next major release.) in favor this.options.<property>
    this.hot = this.options.hot || this.options.hotOnly
    this.headers = this.options.headers
    this.progress = this.options.progress

    this.serveIndex = this.options.serveIndex

    this.clientOverlay = this.options.overlay
    this.clientLogLevel = this.options.clientLogLevel

    this.publicHost = this.options.public
    this.allowedHosts = this.options.allowedHosts
    this.disableHostCheck = !!this.options.disableHostCheck

    this.watchOptions = options.watchOptions || {}

    // Replace leading and trailing slashes to normalize path
    this.sockPath = `/${
      this.options.sockPath
        ? this.options.sockPath.replace(/^\/|\/$/g, '')
        : 'sockjs-node'
    }`

    if (this.progress) {
      this.setupProgressPlugin()
    }

    this.setupHooks() // 监听 webpack 构建的 compile invalid done 事件，通过 web socket 向浏览器端发送 webpack 编译相关信息
    this.setupApp() // 创建服务器应用 this.app = new express();
    this.setupCheckHostRoute()
    // 安装 webpack-dev-middleware 中间件，但暂未注册到 this.app，只是赋值到 this.middleware。
    // 改变 webpack 的写入文件 fileSystem 的方式为内存形式，通过 webpack.watch 观察文件变化，并注册 invalid run done watchRun 事件
    this.setupDevMiddleware() 

    /**
     * 注入了一个 webpack-dev-server 路由，我们可以在开启本地服务后尝试访问，看其返回的内容
     * /webpack-dev-server 返回当前内存中服务根目录和文件，相当于查看构建后 dist 目录文件
     * 
     * 以下返回的客户文件都在 /webpack-dev-server/client 目录下
     * /webpack-dev-server/* 返回 live.html
     * /webpack-dev-server/invalidate
     * /webpack-dev-server.js 返回 index.bundle.js
     * /__webpack_dev_server__/sockjs.bundle.js
     * /__webpack_dev_server__/live.bundle.js
     */
    routes(this)

    // Keep track of websocket proxies for external websocket upgrade.
    this.websocketProxies = []

    this.setupFeatures() // 根据 options 的选项，开始注册一系列相关的中间件到 this.app 中，包括本她开发依赖的 webpack-dev-middleware，代理 proxy，静态资源服务 static 等
    this.setupHttps() // HTTPS 相关实现
    this.createServer() // 创建服务器实例 this.listeningApp = http.createServer(this.app);

    killable(this.listeningApp)

    // Proxy websockets without the initial http request
    // https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade
    this.websocketProxies.forEach(function (wsProxy) {
      this.listeningApp.on('upgrade', wsProxy.upgrade)
    }, this)
  }

  createServer() {
    if (this.options.https) {
      const isHttp2 = this.options.http2 !== false;
      if (semver.gte(process.version, '10.0.0') || !isHttp2) {
        if (this.options.http2) {
          this.log.warn(
            'HTTP/2 is currently unsupported for Node 10.0.0 and above, but will be supported once Express supports it'
          );
        }
        this.listeningApp = https.createServer(this.options.https, this.app);
      } else {
        this.listeningApp = require('spdy').createServer(
          this.options.https,
          this.app
        );
      }
    } else {
      this.listeningApp = http.createServer(this.app);
    }

    this.listeningApp.on('error', (err) => {
      this.log.error(err);
    });
  }

  /**
   * 外部在new Server 调用后，再调用 server.listen 函数，即执行 this.listeningAPP.listen 正式开启开发服务
   * server = new Server(compiler, options);
   * server.listen(options.port, options.host, (err) => {if (err) { throw err; }});
   */
   listen(port, hostname, fn) {
    this.hostname = hostname;

    // 在开启 this.app 服务的同时，也会开启 scoke server 服务
    return this.listeningApp.listen(port, hostname, (err) => {
      this.createSocketServer();

      if (this.options.bonjour) {
        runBonjour(this.options);
      }

      this.showStatus();

      if (fn) {
        fn.call(this.listeningApp, err);
      }

      if (typeof this.options.onListening === 'function') {
        this.options.onListening(this);
      }
    });
  }

  /**
   * 在 cli 的入口文件中，监听进程退出信息，关闭服务
   * setupExitSignals(serverData);
   */
  // /lib/utils/setupExitSignals.js
  // shell 中 ctrl + c 会向对当前前台进程,和他的所在的进程组的每个进程都发送 SIGINT 信号
  //  SIGTERM 信号由 shell 中的 kill 函数发出
  //  const signals = ['SIGINT', 'SIGTERM'];
  //  function setupExitSignals(serverData) {
  //    signals.forEach((signal) => {
  //      process.on(signal, () => {
  //        if (serverData && serverData.server) {
  //          serverData.server.close(() => {
  //            process.exit();
  //          });
  //        } else {
  //          process.exit();
  //        }
  //      });
  //    });
  //  }
  close(cb) {
    this.sockets.forEach((socket) => {
      this.socketServer.close(socket);
    });
    this.sockets = [];
    this.contentBaseWatchers.forEach((watcher) => {
      watcher.close();
    });
    this.contentBaseWatchers = [];
    this.listeningApp.kill(() => {
      this.middleware.close(cb);
    });
  }
}

/**
 * 上面只是初始化 server 实例。注册了一些关于 webpack-dev-server 的路由。真正实现 server 功能的是在 webpack-dev-middleware 中间件。
 * 比如静态资源访问的功能，如，我们访问 localhost:8080/ 返回 index.html 文件的功能
 */
/**
 * webpack-dev-middleware 中间的注册
 */
const webpackDevMiddleware = require('webpack-dev-middleware');
this.setupDevMiddleware(); // constructor 函数中
setupDevMiddleware() {
  // middleware for serving webpack bundle
  this.middleware = webpackDevMiddleware(
    this.compiler,
    Object.assign({}, this.options, { logLevel: this.log.options.level })
  );
}
setupMiddleware() {
  this.app.use(this.middleware);
}
setupFeatures() {
  const features = {
    // 省略代码
    middlewar: () => {
      this.setupMiddleware()
    }
  }

  // webpack 只要开启了 proxy、historyApiFallback 功能都依赖本地服务
  const runnableFeatures = [];
  runnableFeatures.push('setup', 'before', 'headers', 'middleware');
  if (this.options.proxy) {
    runnableFeatures.push('proxy', 'middleware');
  }
  if (this.options.historyApiFallback) {
    runnableFeatures.push('historyApiFallback', 'middleware');
    // 省略代码
  }
  (this.options.features || runnableFeatures).forEach((feature) => {
    features[feature]();
  });
}
this.setupFeatures() // constructor 函数中，根据 options 的选项，开始注册一系列相关的中间件到 this.app 中，包括本她开发依赖的 webpack-dev-middleware，代理 proxy，静态资源服务 static 等

/**
 * webpack-dev-middleware 实现逻辑 webpack-dev-middleware/index.js
 * const webpackDevMiddleware = require('webpack-dev-middleware');
 * setupDevMiddleware() {
    this.middleware = webpackDevMiddleware(
      this.compiler,
      Object.assign({}, this.options, { logLevel: this.log.options.level })
    );
  }
 */
const defaults = {
  logLevel: 'info',
  logTime: false,
  logger: null,
  mimeTypes: null,
  reporter,
  stats: {
    colors: true,
    context: process.cwd(),
  },
  watchOptions: {
    aggregateTimeout: 200,
  },
  writeToDisk: false,
};
module.exports = function wdm(compiler, opts) {
  // 省略部分代码

  // 1. 合并选项，添加一些默认选项 defaluts
  const options = Object.assign({}, defaults, opts);
  // 2. 创建上下文对象，在此注册 webpack hooks 监听：invalid run done watchRun
  const context = createContext(compiler, options);
  
  // 3. 改写 webpack 的写入模式为内存模式
  setFs(context, compiler);
  
  // 4. 生成中间件函数
  const _middleware = middlewar(context)
  // 将中间件函数作为对象，挂载部分可用的方法
  Object.assign(_middleware, {
    context,
    fileSystem: context.fs,
    getFilenameFromUrl: getFilenameFromUrl.bind(
      this,
      context.options.publicPath,
      context.compiler
    ),
    close(callback) {
      callback = callback || noop;
      if (context.watching) {
        context.watching.close(callback);
      } else {
        callback();
      }
    },
    invalidate(callback) {
      callback = callback || noop;
      if (context.watching) {
        ready(context, callback, {});
        context.watching.invalidate();
      } else {
        callback();
      }
    },
    waitUntilValid(callback) {
      callback = callback || noop;
      ready(context, callback, {});
    },
  })

  // 5. 返回中间件函数，供 this.app.use 注册
  return _middleware
}

/**
 * 关键步骤一：
 * const createContext = require('./lib/context');
 * const context = createContext(compiler, options);
 */
module.exports = function ctx(compiler, options) {
  const context = {
    state: false,
    webpackStats: null,
    callbacks: [],
    options,
    compiler,
    watching: null,
    forceRebuild: false,
  };

  if (options.logger) {
    context.log = options.logger;
  } else {
    context.log = weblog({
      level: options.logLevel || 'info',
      name: 'wdm',
      timestamp: options.logTime,
    });
  }

  context.rebuild = rebuild;
  context.compiler.hooks.invalid.tap('WebpackDevMiddleware', invalid);
  context.compiler.hooks.run.tap('WebpackDevMiddleware', invalid);
  context.compiler.hooks.done.tap('WebpackDevMiddleware', done);
  context.compiler.hooks.watchRun.tap(
    'WebpackDevMiddleware',
    (comp, callback) => {
      invalid(callback);
    }
  );
  
  const { log } = context;
  function rebuild() {
    if (context.state) {
      context.state = false;
      context.compiler.run((err) => {
        if (err) {
          log.error(err.stack || err);
          if (err.details) {
            log.error(err.details);
          }
        }
      });
    } else {
      context.forceRebuild = true;
    }
  }

  function invalid(callback) {
    if (context.state) {
      context.options.reporter(context.options, {
        log,
        state: false,
      });
    }

    // We are now in invalid state
    context.state = false;
    if (typeof callback === 'function') {
      callback();
    }
  }

  function done(stats) {
    // We are now on valid state
    context.state = true;
    context.webpackStats = stats;

    // Do the stuff in nextTick, because bundle may be invalidated
    // if a change happened while compiling
    process.nextTick(() => {
      // check if still in valid state
      if (!context.state) {
        return;
      }

      // print webpack output
      context.options.reporter(context.options, {
        log,
        state: true,
        stats,
      });

      // execute callback that are delayed
      const cbs = context.callbacks;
      context.callbacks = [];
      cbs.forEach((cb) => {
        cb(stats);
      });
    });

    // In lazy mode, we may issue another rebuild
    if (context.forceRebuild) {
      context.forceRebuild = false;
      rebuild();
    }
  }
  return context
}

/**
 * 关键步骤二：
 * const { setFs, toDisk } = require('./lib/fs');
 * setFs(context, compiler);
 */
const MemoryFileSystem = require('memory-fs');
module.exports = {
  toDisk(context) {/**省略代码 */},
  setFs(context, compiler) {
    // 要求 outputPath 是绝对路径
    if (
      typeof compiler.outputPath === 'string' &&
      !path.posix.isAbsolute(compiler.outputPath) &&
      !path.win32.isAbsolute(compiler.outputPath)
    ) {
      throw new DevMiddlewareError(
        '`output.path` needs to be an absolute path or `/`.'
      );
    }

    let fileSystem;
    const isConfiguredFs = context.options.fs;
    const isMemoryFs =
      !isConfiguredFs &&
      !compiler.compilers &&
      compiler.outputFileSystem instanceof MemoryFileSystem;

    if (isConfiguredFs) { // 用户自定义文件系统
      const { fs } = context.options;

      if (typeof fs.join !== 'function') {
        // very shallow check
        throw new Error(
          'Invalid options: options.fs.join() method is expected'
        );
      }
      compiler.outputFileSystem = fs;
      fileSystem = fs;
    } else if (isMemoryFs) { // 如果已经是 MemoryFileSystem 系统则直接用
      fileSystem = compiler.outputFileSystem;
    } else { // 否则实例化内存文件系统
      fileSystem = new MemoryFileSystem();
      compiler.outputFileSystem = fileSystem;
    }
    context.fs = fileSystem;
  },
}

/**
 * 关键步骤三：
 * const middleware = require('./lib/middleware');
 * const _middleware = middlewar(context)
 */
module.exports = function wrapper(context) {
  return function middleware(req, res, next) {
    function goNext() {
      if (!context.options.serverSideRender) {
        return next();
      }
      // 省略 serverSideRender 的 next 逻辑
    }

    // webpack-dev-server 自身只处理 GET HEAD 请求，其它请求放行
    const acceptedMethods = context.options.methods || ['GET', 'HEAD'];
    if (acceptedMethods.indexOf(req.method) === -1) {
      return goNext();
    }

    // 根据请求 req.url 生成文件完整路径名称
    let filename = getFilenameFromUrl(
      context.options.publicPath,
      context.compiler,
      req.url
    );

    if (filename === false) {
      return goNext();
    }

    return new Promise((resolve) => {
      handleRequest(context, filename, processRequest, req);
    })
  }
}

/**
 * handleRequest 实现
 * const { handleRequest } = require('./utils')
 */
module.exports = {
  handleRequest(context, filename, processRequest, req) {
    // in lazy mode, rebuild on bundle request
    if (
      context.options.lazy &&
      (!context.options.filename || context.options.filename.test(filename))
    ) {
      context.rebuild();
    }

    // const HASH_REGEXP = /[0-9a-f]{10,}/;
    if (HASH_REGEXP.test(filename)) {
      try {
        if (context.fs.statSync(filename).isFile()) {
          processRequest();
          return;
        }
      } catch (e) {
      }
    }

    ready(context, processRequest, req);
  },
}
function ready(context, fn, req) {
  if (context.state) {
    return fn(context.webpackStats);
  }
  context.log.info(`wait until bundle finished: ${req.url || fn.name}`);
  context.callbacks.push(fn);
  // 注意这里 context.callbacks 注册，那它的什么执行？
  // 是在 createContext 函数中 hooks.done 的钩子函数
  // context.compiler.hooks.done.tap('WebpackDevMiddleware', done);
  // function done(stats) {
  //   process.nextTick(() => {
  //     const cbs = context.callbacks;
  //     context.callbacks = [];
  //     cbs.forEach((cb) => {
  //       cb(stats);
  //     });
  //   })
  // } 
}

// 真正执行请求的是 processRequest 函数
// webpack-dev-middleware/lib/middleware.js
// return function middleware(req, res, next) {
//   return new Promise((resolve) => {
//     handleRequest(context, filename, processRequest, req);
//     function processRequest() {...}
//   })
// }
function processRequest() {
  // 如果请求的 req.url 是一个目录的处理，返回目录下的 index.html
  try {
    let stat = context.fs.statSync(filename);
    if (!stat.isFile()) {
      if (stat.isDirectory()) {
        let { index } = context.options;

        // eslint-disable-next-line no-undefined
        if (index === undefined || index === true) {
          index = 'index.html';
        } else if (!index) {
          throw new DevMiddlewareError('next');
        }

        filename = path.posix.join(filename, index);
        stat = context.fs.statSync(filename);

        if (!stat.isFile()) {
          throw new DevMiddlewareError('next');
        }
      } else {
        throw new DevMiddlewareError('next');
      }
    }
  } catch (e) {
    return resolve(goNext());
  }

  // 如果请求的 req.url 是一个文件处理逻辑

  let content = context.fs.readFileSync(filename);

  // 根据文件内容处理请求头 Content-Type
  content = handleRangeHeaders(content, req, res); 
  let contentType = mime.getType(filename) || '';

  // const NonCharsetFileTypes = /\.(wasm|usdz)$/;
  if (!NonCharsetFileTypes.test(filename)) {
    contentType += '; charset=UTF-8';
  }

  if (!res.getHeader || !res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', contentType);
  }

  res.setHeader('Content-Length', content.length);

  // 加上 webpack.config.js 中 devServer.headers 自定义的响应头字段
  const { headers } = context.options;
  if (headers) {
    for (const name in headers) {
      if ({}.hasOwnProperty.call(headers, name)) {
        res.setHeader(name, context.options.headers[name]);
      }
    }
  }

  // Express automatically sets the statusCode to 200, but not all servers do (Koa).
  res.statusCode = res.statusCode || 200;

  if (res.send) {
    res.send(content);
  } else {
    res.end(content);
  }

  resolve();
}

/**
 * 现在在看一下如何从 req.url 变成 filename
 * const { getFilenameFromUrl } = require('./utils')
 */
// let filename = getFilenameFromUrl(
//   context.options.publicPath,
//   context.compiler,
//   req.url
// );
const path = require('path');
const { parse } = require('url');
const querystring = require('querystring');

getFilenameFromUrl(pubPath, compiler, url) {
  const { outputPath, publicPath } = getPaths(pubPath, compiler, url);
  const localPrefix = parse(publicPath || '/', false, true);
  const urlObject = parse(url);
  let filename;

  const hostNameIsTheSame = localPrefix.hostname === urlObject.hostname;

  // publicPath has the hostname that is not the same as request url's, should fail
  if (
    localPrefix.hostname !== null &&
    urlObject.hostname !== null &&
    !hostNameIsTheSame
  ) {
    return false;
  }

  // publicPath is not in url, so it should fail
  if (publicPath && hostNameIsTheSame && url.indexOf(publicPath) !== 0) {
    return false;
  }

  // strip localPrefix from the start of url
  if (urlObject.pathname.indexOf(localPrefix.pathname) === 0) {
    filename = urlObject.pathname.substr(localPrefix.pathname.length);
  }

  if (
    !urlObject.hostname &&
    localPrefix.hostname &&
    url.indexOf(localPrefix.path) !== 0
  ) {
    return false;
  }

  let uri = outputPath;

  /* istanbul ignore if */
  if (process.platform === 'win32') {
    // Path Handling for Microsoft Windows
    if (filename) {
      uri = path.posix.join(outputPath || '', querystring.unescape(filename));

      if (!path.win32.isAbsolute(uri)) {
        uri = `/${uri}`;
      }
    }

    return uri;
  }

  // Path Handling for all other operating systems
  if (filename) {
    uri = path.posix.join(outputPath || '', filename);

    if (!path.posix.isAbsolute(uri)) {
      uri = `/${uri}`;
    }
  }

  // if no matches, use outputPath as filename
  return querystring.unescape(uri);
}

// 从多个 multi-compiler 配置中获取公共路径和输入路径
function getPaths(publicPath, compiler, url) {
  const compilers = compiler && compiler.compilers;
  if (Array.isArray(compilers)) {
    let compilerPublicPath;

    // the path portion of compilerPublicPath
    let compilerPublicPathBase;

    for (let i = 0; i < compilers.length; i++) {
      compilerPublicPath =
        compilers[i].options &&
        compilers[i].options.output &&
        compilers[i].options.output.publicPath;

      if (compilerPublicPath) {
        compilerPublicPathBase =
          compilerPublicPath.indexOf('/') === 0
            ? compilerPublicPath // eslint-disable-next-line
            : // handle the case where compilerPublicPath is a URL with hostname
              parse(compilerPublicPath).pathname;

        // check the url vs the path part of the compilerPublicPath
        if (url.indexOf(compilerPublicPathBase) === 0) {
          return {
            publicPath: compilerPublicPath,
            outputPath: compilers[i].outputPath,
          };
        }
      }
    }
  }
  return {
    publicPath,
    outputPath: compiler.outputPath,
  }
}

/**
 * 总结 webpack-dev-middleware 作用
 * 1. 改写了 webpack 的文件系统，将编译后 dist 目录的文件写入内存中
 * 2. 注册了 webpack hooks 的钩子函数，主要是 done()
 * 3. 处理 GET 请求，读取文件系统的文件返回。相当于一个静态文件服务
 */
