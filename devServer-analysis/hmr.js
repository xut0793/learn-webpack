/*
 * @Author       : xut
 * @Date         : 2021-07-02 07:19:25
 * @LastEditTime : 2021-08-16 08:56:05
 * @LastEditors  : xut
 * @Description  : webpack-dev-server 中 HMR 的处理
 */

/**
 * HMR全称Hot Module Replacement，翻译为模块热替换。是指在应用程序运行过程中，替换、添加、删除模块，而无需重新刷新整个页面。
 * 特点是：
 * 不重新加载整个页面，这样可以保留某些应用程序的状态不丢失；
 * 只需更新需要变化的内容，节省开发时间
 * 修改了css、js源代码，会立即在浏览器更新，相当于直接在浏览器的devtools中直接修改样式。
 */
// webpack-dev-server 默认在不开启HMR的情况下，修改了源代码后，整个页面会自动刷新，使用的是live reloading，原理是调用 location.reload()
// 如果要开启 HMR，只需要两步：
// 1. 开启 devServer.hot ，开启该选项后，webpack-dev-server 会自动安装 webpack.HotModuleReplacementPlugin 插件
// 2. 业务代码注入主动调用 module.hot.accept(filePath, cb) 函数，传入更新的回调函数，在 vue-loader 插件会自动注入该段代码
module.exports = {
  //省略 entry output
  mode: 'development',
  devServer: {
    hot: true,
  },
}

/**
 * 源码
 * 1. devServer.hot = true 如何开启 HMR，即自动注入 webpack.HotModuleReplacementPlugin
 * 2. 开启 scoket 服务，让服务端和客户端能双向通信
 * 3. HMR 实现需要在客户端注入 HMR.runtime 运行时代码
 */
class Server {
  constructor(compiler, options = {}, _log) {
    // 省略其它代码
    updateCompiler(this.compiler, this.options)
  }
}

// const updateCompiler = require('./utils/updateCompiler');
/**
 * webpack-dev-server/lib/utils/updateCompiler.js
 */
const addEntries = require('./addEntries')
function updateCompiler(compiler, options) {
  if (options.inline !== false) {
    /**
     * 遍历所有compiler，将其中没有配置 HMRPlugin 的编译实例收集到 compilersWithoutHMR 中
     */
    const findHMRPlugin = (config) => {
      if (!config.plugins) {
        return undefined
      }

      return config.plugins.find(
        (plugin) => plugin.constructor === webpack.HotModuleReplacementPlugin
      )
    }

    const compilers = []
    const compilersWithoutHMR = []
    let webpackConfig
    if (compiler.compilers) {
      webpackConfig = []
      compiler.compilers.forEach((compiler) => {
        webpackConfig.push(compiler.options)
        compilers.push(compiler)
        if (!findHMRPlugin(compiler.options)) {
          compilersWithoutHMR.push(compiler)
        }
      })
    } else {
      webpackConfig = compiler.options
      compilers.push(compiler)
      if (!findHMRPlugin(compiler.options)) {
        compilersWithoutHMR.push(compiler)
      }
    }

    /**
     * 两个作用：
     * 1. 修改 webpack config 的 entry，向其中 entry 添加客户端运行时，包括 socket HMR 的运行时代码
     * 2. 修改 webpack config 的 plugins，如果配置中开启了 hot，但没有主动添加 HMRPlugin 的，自动添加 HMRPlugin 插件
     */
    addEntries(webpackConfig, options)

    compilers.forEach((compiler) => {
      const config = compiler.options
      compiler.hooks.entryOption.call(config.context, config.entry)

      const providePlugin = new webpack.ProvidePlugin({
        __webpack_dev_server_client__: getSocketClientPath(options),
      })
      providePlugin.apply(compiler)
    })

    /***
     * compilersWithoutHMR 中没有添加 HMRPlugin 插件的，在 addEntries 中都自动添加了该插件
     * 所以这里就执行 HMRPlugin 插件
     */
    // do not apply the plugin unless it didn't exist before.
    if (options.hot || options.hotOnly) {
      compilersWithoutHMR.forEach((compiler) => {
        // addDevServerEntrypoints above should have added the plugin
        // to the compiler options
        const plugin = findHMRPlugin(compiler.options)
        if (plugin) {
          plugin.apply(compiler)
        }
      })
    }
  }
}
module.exports = updateCompiler

/**
 * const addEntries = require('./addEntries');
 * webpack-dev-server/lib/utils/addEntries.js
 */
function addEntries(config, options, server) {
  if (options.inline !== false) {
    const app = server || {
      address() {
        return { port: options.port }
      },
    }

    const domain = createDomain(options, app)
    const sockHost = options.sockHost ? `&sockHost=${options.sockHost}` : ''
    const sockPath = options.sockPath ? `&sockPath=${options.sockPath}` : ''
    const sockPort = options.sockPort ? `&sockPort=${options.sockPort}` : ''

    // 主要是 scoket 客户端运行代码
    const clientEntry = `${require.resolve(
      '../../client/'
    )}?${domain}${sockHost}${sockPath}${sockPort}`

    // hot 运行时代码
    let hotEntry
    if (options.hotOnly) {
      hotEntry = require.resolve('webpack/hot/only-dev-server')
    } else if (options.hot) {
      hotEntry = require.resolve('webpack/hot/dev-server')
    }

    /**
     * 增加 webpack config 中 entry，主要是 clientEntry hotEntry
     */
    const prependEntry = (originalEntry, additionalEntries) => {
      if (typeof originalEntry === 'function') {
        return () =>
          Promise.resolve(originalEntry()).then((entry) =>
            prependEntry(entry, additionalEntries)
          )
      }

      if (typeof originalEntry === 'object' && !Array.isArray(originalEntry)) {
        const clone = {}
        Object.keys(originalEntry).forEach((key) => {
          // entry[key] should be a string here
          const entryDescription = originalEntry[key]
          if (typeof entryDescription === 'object' && entryDescription.import) {
            clone[key] = Object.assign({}, entryDescription, {
              import: prependEntry(entryDescription.import, additionalEntries),
            })
          } else {
            clone[key] = prependEntry(entryDescription, additionalEntries)
          }
        })

        return clone
      }

      // in this case, entry is a string or an array.
      // make sure that we do not add duplicates.
      /** @type {Entry} */
      const entriesClone = additionalEntries.slice(0)
      ;[].concat(originalEntry).forEach((newEntry) => {
        if (!entriesClone.includes(newEntry)) {
          entriesClone.push(newEntry)
        }
      })
      return entriesClone
    }

    const checkInject = (option, _config, defaultValue) => {
      if (typeof option === 'boolean') return option
      if (typeof option === 'function') return option(_config)
      return defaultValue
    }

    ;[].concat(config).forEach((config) => {
      // webTarget = true 因为 webpackConfig.target 默认 web
      const webTarget = [
        'web',
        'webworker',
        'electron-renderer',
        'node-webkit',
        undefined, // eslint-disable-line
        null,
      ].includes(config.target)

      const additionalEntries = checkInject(
        options.injectClient,
        config,
        webTarget
      )
        ? [clientEntry]
        : []

      if (hotEntry && checkInject(options.injectHot, config, true)) {
        additionalEntries.push(hotEntry)
      }
      // additionalEntries = [clientEntry, hotEntry]
      config.entry = prependEntry(config.entry || './src', additionalEntries)

      /******
       * 如果开启了 options.hot，但没有主动配置 HMRPlugin，则自动添加该插件
       */
      if (options.hot || options.hotOnly) {
        config.plugins = config.plugins || []
        if (
          !config.plugins.find(
            (plugin) => plugin.constructor.name === 'HotModuleReplacementPlugin'
          )
        ) {
          config.plugins.push(new webpack.HotModuleReplacementPlugin())
        }
      }
    })
  }
}

module.exports = addEntries

/******
 * 开启 scoket 服务，让服务端和客户端能双向通信
 *
 * 在 addEntries 中添加了 clientEntry，主要就是赂客户端注入 socket 的运行时代码
 * const clientEntry = `${require.resolve('../../client/')}?${domain}${sockHost}${sockPath}${sockPort}`;
 */
// webpack-dev-server/client/index.js

// window 全局变量
var status = {
  isUnloading: false,
  currentHash: '',
}
var options = {
  hot: false,
  hotReload: true,
  liveReload: false,
  initial: true,
  useWarningOverlay: false,
  useErrorOverlay: false,
  useProgress: false,
}
var createSocketUrl = require('./utils/createSocketUrl')
var socket = require('./socket')

var socketUrl = createSocketUrl(__resourceQuery) // 组装 scoketUrl
socket(socketUrl, onSocketMessage)

// webpack-dev-server/client/socket.js
// _webpak_dev_server_client__ 在 Server 中 updateCompiler 函数中通过 providePlugin 插件注入 socket
var Client =
  typeof __webpack_dev_server_client__ !== 'undefined'
    ? __webpack_dev_server_client__ // eslint-disable-next-line import/no-unresolved
    : require('./clients/SockJSClient')
var retries = 0
var client = null

// socket 双向边境中断时，会自动尝试 10 次重新连接
var socket = function initSocket(url, handlers) {
  client = new Client(url)
  client.onOpen(function () {
    retries = 0
  })
  client.onClose(function () {
    if (retries === 0) {
      handlers.close()
    } // Try to reconnect.

    client = null // After 10 retries stop trying, to prevent logspam.

    if (retries <= 10) {
      // Exponentially increase timeout to reconnect.
      // Respectfully copied from the package `got`.
      // eslint-disable-next-line no-mixed-operators, no-restricted-properties
      var retryInMs = 1000 * Math.pow(2, retries) + Math.random() * 100
      retries += 1
      setTimeout(function () {
        socket(url, handlers)
      }, retryInMs)
    }
  })
  client.onMessage(function (data) {
    var msg = JSON.parse(data)

    if (handlers[msg.type]) {
      handlers[msg.type](msg.data)
    }
  })
}

module.exports = socket

// 重要的是 socket 中 onMessage 事件的处理
// client.onMessage(function (data) {
//   var msg = JSON.parse(data);

//   if (handlers[msg.type]) {
//     handlers[msg.type](msg.data);
//   }
// });

// 其中 handlers 就是 client/index.js 中定义的 onSocketMessage
// 关注 hot hash ok 事件的处理
var onSocketMessage = {
  hot: function hot() {
    options.hot = true
    log.info('[WDS] Hot Module Replacement enabled.')
  },
  liveReload: function liveReload() {
    options.liveReload = true
    log.info('[WDS] Live Reloading enabled.')
  },
  invalid: function invalid() {
    log.info('[WDS] App updated. Recompiling...') // fixes #1042. overlay doesn't clear if errors are fixed but warnings remain.

    if (options.useWarningOverlay || options.useErrorOverlay) {
      overlay.clear()
    }

    sendMessage('Invalid')
  },
  hash: function hash(_hash) {
    status.currentHash = _hash
  },
  'still-ok': function stillOk() {
    log.info('[WDS] Nothing changed.')

    if (options.useWarningOverlay || options.useErrorOverlay) {
      overlay.clear()
    }

    sendMessage('StillOk')
  },
  'log-level': function logLevel(level) {
    var hotCtx = require.context('webpack/hot', false, /^\.\/log$/)

    if (hotCtx.keys().indexOf('./log') !== -1) {
      hotCtx('./log').setLogLevel(level)
    }

    setLogLevel(level)
  },
  overlay: function overlay(value) {
    if (typeof document !== 'undefined') {
      if (typeof value === 'boolean') {
        options.useWarningOverlay = false
        options.useErrorOverlay = value
      } else if (value) {
        options.useWarningOverlay = value.warnings
        options.useErrorOverlay = value.errors
      }
    }
  },
  progress: function progress(_progress) {
    if (typeof document !== 'undefined') {
      options.useProgress = _progress
    }
  },
  'progress-update': function progressUpdate(data) {
    if (options.useProgress) {
      log.info('[WDS] '.concat(data.percent, '% - ').concat(data.msg, '.'))
    }

    sendMessage('Progress', data)
  },
  ok: function ok() {
    sendMessage('Ok')

    if (options.useWarningOverlay || options.useErrorOverlay) {
      overlay.clear()
    }

    if (options.initial) {
      return (options.initial = false)
    } // eslint-disable-line no-return-assign

    reloadApp(options, status)
  },
  'content-changed': function contentChanged() {
    log.info('[WDS] Content base changed. Reloading...')
    self.location.reload()
  },
  warnings: function warnings(_warnings) {
    log.warn('[WDS] Warnings while compiling.')

    var strippedWarnings = _warnings.map(function (warning) {
      return stripAnsi(warning)
    })

    sendMessage('Warnings', strippedWarnings)

    for (var i = 0; i < strippedWarnings.length; i++) {
      log.warn(strippedWarnings[i])
    }

    if (options.useWarningOverlay) {
      overlay.showMessage(_warnings)
    }

    if (options.initial) {
      return (options.initial = false)
    } // eslint-disable-line no-return-assign

    reloadApp(options, status)
  },
  errors: function errors(_errors) {
    log.error('[WDS] Errors while compiling. Reload prevented.')

    var strippedErrors = _errors.map(function (error) {
      return stripAnsi(error)
    })

    sendMessage('Errors', strippedErrors)

    for (var i = 0; i < strippedErrors.length; i++) {
      log.error(strippedErrors[i])
    }

    if (options.useErrorOverlay) {
      overlay.showMessage(_errors)
    }

    options.initial = false
  },
  error: function error(_error) {
    log.error(_error)
  },
  close: function close() {
    log.error('[WDS] Disconnected!')
    sendMessage('Close')
  },
}

// var sendMessage = require('./utils/sendMessage');
// sendMessage.js
function sendMsg(type, data) {
  if (
    typeof self !== 'undefined' &&
    (typeof WorkerGlobalScope === 'undefined' ||
      !(self instanceof WorkerGlobalScope))
  ) {
    self.postMessage(
      {
        type: 'webpack'.concat(type), // webpack.hot webpack.hash webpack.ok 消息事件
        data: data,
      },
      '*'
    )
  }
}

// webpack-dev-server/client/utils/reloadApp.js
// reloadApp(options, status);
function reloadApp(_ref, _ref2) {
  var hotReload = _ref.hotReload,
    hot = _ref.hot,
    liveReload = _ref.liveReload
  var isUnloading = _ref2.isUnloading,
    currentHash = _ref2.currentHash

  if (isUnloading || !hotReload) {
    return
  }

  if (hot) {
    log.info('[WDS] App hot update...')

    var hotEmitter = require('webpack/hot/emitter')

    // 触发 webpackHotUpdate 事件，传入当前 hash 值。
    // 在 webpack/hot/dev-server.js 中 hotEmitter.on('webpackHotUpdate', cb)
    hotEmitter.emit('webpackHotUpdate', currentHash)

    if (typeof self !== 'undefined' && self.window) {
      // broadcast update to window
      self.postMessage('webpackHotUpdate'.concat(currentHash), '*')
    }
  } // allow refreshing the page only if liveReload isn't disabled
  else if (liveReload) {
    var rootWindow = self // use parent window for reload (in case we're in an iframe with no valid src)

    var intervalId = self.setInterval(function () {
      if (rootWindow.location.protocol !== 'about:') {
        // reload immediately if protocol is valid
        applyReload(rootWindow, intervalId)
      } else {
        rootWindow = rootWindow.parent

        if (rootWindow.parent === rootWindow) {
          // if parent equals current window we've reached the root which would continue forever, so trigger a reload anyways
          applyReload(rootWindow, intervalId)
        }
      }
    })
  }

  function applyReload(rootWindow, intervalId) {
    clearInterval(intervalId)
    log.info('[WDS] App updated. Reloading...')
    rootWindow.location.reload()
  }
}

module.exports = reloadApp

// 服务器端开启 socket
class Server {
  constructor(compiler, options = {}, _log) {
    this.socketServerImplementation = getSocketServerImplementation(
      this.options
    )
    this.sockets = []
    this.setupHooks() // 注册编译事件，向客户端通信
  }

  /**
   * 在 webpack-dev-server 的 cli 文件中，即 bin 文件中 startDevServer 中调用 listen 函数
   * server = new Server(compiler, options, log);
   * if (options.socket) {
   *   server.listen(options.socket, options.host, (err) => { if (err) { throw err; } });
   * } else {
   *   server.listen(options.port, options.host, (err) => { if (err) { throw err; } });
   * }
   */
  listen(port, hostname, fn) {
    this.hostname = hostname

    return this.listeningApp.listen(port, hostname, (err) => {
      this.createSocketServer()
      // 省略代码
    })
  }
  createSocketServer() {
    const SocketServerImplementation = this.socketServerImplementation
    this.socketServer = new SocketServerImplementation(this)

    // 注册连接事件
    this.socketServer.onConnection((connection, headers) => {
      if (!connection) {
        return
      }

      // 省略代码
      this.sockets.push(connection)
      this.socketServer.onConnectionClose(connection, () => {
        const idx = this.sockets.indexOf(connection)
        if (idx >= 0) {
          this.sockets.splice(idx, 1)
        }
      })

      // 对应客户端注册的事件 onSocketMessage
      if (this.clientLogLevel) {
        this.sockWrite([connection], 'log-level', this.clientLogLevel)
      }

      if (this.hot) {
        this.sockWrite([connection], 'hot')
      }

      // TODO: change condition at major version
      if (this.options.liveReload !== false) {
        this.sockWrite([connection], 'liveReload', this.options.liveReload)
      }

      if (this.progress) {
        this.sockWrite([connection], 'progress', this.progress)
      }

      if (this.clientOverlay) {
        this.sockWrite([connection], 'overlay', this.clientOverlay)
      }

      if (!this._stats) {
        return
      }

      this._sendStats([connection], this.getStats(this._stats), true)
    })
  }
  // 发送 hot liveReload progress overlay log-level 这类一次性事件
  // 在初始化时发送一次
  sockWrite(sockets, type, data) {
    sockets.forEach((socket) => {
      this.socketServer.send(socket, JSON.stringify({ type, data }))
    })
  }
  // 在每次 webpack 编译后都会调用，发送每次编译信息，hash ok 事件
  _sendStats(sockets, stats, force) {
    const shouldEmit =
      !force &&
      stats &&
      (!stats.errors || stats.errors.length === 0) &&
      stats.assets &&
      stats.assets.every((asset) => !asset.emitted)

    if (shouldEmit) {
      return this.sockWrite(sockets, 'still-ok')
    }

    this.sockWrite(sockets, 'hash', stats.hash)

    if (stats.errors.length > 0) {
      this.sockWrite(sockets, 'errors', stats.errors)
    } else if (stats.warnings.length > 0) {
      this.sockWrite(sockets, 'warnings', stats.warnings)
    } else {
      this.sockWrite(sockets, 'ok')
    }
  }
  getStats(statsObj) {
    // 获取 hash assets warnings errors 的编译信息
    // DEFAULT_STATS = {
    //   all: false,
    //   hash: true,
    //   assets: true,
    //   warnings: true,
    //   errors: true,
    //   errorDetails: false,
    // }
    const stats = Server.DEFAULT_STATS

    if (this.originalStats.warningsFilter) {
      stats.warningsFilter = this.originalStats.warningsFilter
    }

    return statsObj.toJson(stats)
  }

  // 注册 webpack 编译事件
  // 在 Server constructor 中就执行了 this.setupHooks()
  setupHooks() {
    // Listening for events
    const invalidPlugin = () => {
      this.sockWrite(this.sockets, 'invalid')
    }

    const addHooks = (compiler) => {
      const { compile, invalid, done } = compiler.hooks

      compile.tap('webpack-dev-server', invalidPlugin)
      invalid.tap('webpack-dev-server', invalidPlugin)
      done.tap('webpack-dev-server', (stats) => {
        this._sendStats(this.sockets, this.getStats(stats))
        this._stats = stats
      })
    }

    if (this.compiler.compilers) {
      this.compiler.compilers.forEach(addHooks)
    } else {
      addHooks(this.compiler)
    }
  }
}

// webpack/hot/dev-server.js
if (module.hot) {
	var lastHash;
	var upToDate = function upToDate() {
		return lastHash.indexOf(__webpack_hash__) >= 0;
	};
	var log = require("./log");
	var check = function check() {
		module.hot
			.check(true)
			.then(function (updatedModules) {
				if (!updatedModules) {
					log("warning", "[HMR] Cannot find update. Need to do a full reload!");
					log(
						"warning",
						"[HMR] (Probably because of restarting the webpack-dev-server)"
					);
					window.location.reload();
					return;
				}

				if (!upToDate()) {
					check();
				}

				require("./log-apply-result")(updatedModules, updatedModules);

				if (upToDate()) {
					log("info", "[HMR] App is up to date.");
				}
			})
			.catch(function (err) {
				var status = module.hot.status();
				if (["abort", "fail"].indexOf(status) >= 0) {
					log(
						"warning",
						"[HMR] Cannot apply update. Need to do a full reload!"
					);
					log("warning", "[HMR] " + log.formatError(err));
					window.location.reload();
				} else {
					log("warning", "[HMR] Update failed: " + log.formatError(err));
				}
			});
	};
	var hotEmitter = require("./emitter");
	hotEmitter.on("webpackHotUpdate", function (currentHash) {
		lastHash = currentHash;
		if (!upToDate() && module.hot.status() === "idle") {
			log("info", "[HMR] Checking for updates on the server...");
			check();
		}
	});
	log("info", "[HMR] Waiting for update signal from WDS...");
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}

/******
 * 客户端 module.hot 的 API 如何注入的？
 * module.hot.check()
 * module.hot.accept()
 *
 * webpack/lib/hmr/HotModuleReplacement.runtime.js
 * 通过 HMRPlugin 中 hooks.processAssets.tap 注入
 */

/******
 * HMR 插件 服务端
 * 1. 在 addEntries 中注册： config.plugins.push(new webpack.HotModuleReplacementPlugin());
 * 2. 在 updateCompiler 中执行 plugin.apply(compiler);
 */
// webpack/lib/HotModuleReplacementPlugin.js
class HotModuleReplacementPlugin {
  constructor(options) {
    this.options = options || {}
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(
      'HotModuleReplacementPlugin',
      (compilation, { normalModuleFactory }) => {
        if (compilation.compiler !== compiler) return
        compilation.hooks.record.tap(
          'HotModuleReplacementPlugin',
          (compilation, records) => {
            /**省略 */
          }
        )
        compilation.hooks.fullHash.tap('HotModuleReplacementPlugin', (hash) => {
          /**省略 */
        })
        // 生成 renderManifest hotUpdateMainJson
        compilation.hooks.processAssets.tap(
          {
            name: 'HotModuleReplacementPlugin',
            stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
          },
          () => {
            /**省略 */
          }
        )
        // 再次注入客户端HMR运行时，HotModuleReplacementRuntimeModule 生成 Module.hot 的 API
        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          'HotModuleReplacementPlugin',
          (chunk, runtimeRequirements) => {
            runtimeRequirements.add(RuntimeGlobals.hmrDownloadManifest)
            runtimeRequirements.add(RuntimeGlobals.hmrDownloadUpdateHandlers)
            runtimeRequirements.add(RuntimeGlobals.interceptModuleExecution)
            runtimeRequirements.add(RuntimeGlobals.moduleCache)
            compilation.addRuntimeModule(
              chunk,
              new HotModuleReplacementRuntimeModule()
            )
          }
        )
      }
    )
  }
}

// webpack/lib/hmr/HotModuleReplacementRuntimeModule.js
class HotModuleReplacementRuntimeModule extends RuntimeModule {
  constructor() {
    super('hot module replacement', RuntimeModule.STAGE_BASIC)
  }
  /**
   * @returns {string} runtime code
   */
  generate() {
    return Template.getFunctionContent(
      require('./HotModuleReplacement.runtime.js')
    )
      .replace(/\$getFullHash\$/g, RuntimeGlobals.getFullHash)
      .replace(
        /\$interceptModuleExecution\$/g,
        RuntimeGlobals.interceptModuleExecution
      )
      .replace(/\$moduleCache\$/g, RuntimeGlobals.moduleCache)
      .replace(/\$hmrModuleData\$/g, RuntimeGlobals.hmrModuleData)
      .replace(/\$hmrDownloadManifest\$/g, RuntimeGlobals.hmrDownloadManifest)
      .replace(
        /\$hmrInvalidateModuleHandlers\$/g,
        RuntimeGlobals.hmrInvalidateModuleHandlers
      )
      .replace(
        /\$hmrDownloadUpdateHandlers\$/g,
        RuntimeGlobals.hmrDownloadUpdateHandlers
      )
  }
}
module.exports = HotModuleReplacementRuntimeModule

// webpack/lib/Template.js
class Tmeplate {
  static getFunctionContent(fn) {
    return fn
      .toString()
      .replace(FUNCTION_CONTENT_REGEX, '')
      .replace(INDENT_MULTILINE_REGEX, '')
      .replace(LINE_SEPARATOR_REGEX, '\n')
  }
}

/******
 * HMR 服务端代码涉及很多 webpack hook 事件的注册，主要代码是回调的执行
 * HMR 客户端代码涉及很多模板的替换，比较难理解，所以直接使用开启 hot 后未执行压缩的 bundle.js 来分析
 * 
 * 涉及：
 * webpack/hot/dev-server.js
 * webpack/lib/HotModuleReplacementPlugin => HMR 插件，注册 compilation.hook 事件，包括 hot 客户端代码输出
 * webpack/lib/hmr/HotModuleReplacementRuntimeModule => 替换模板变量，生成 HMR runtime 代码
 * webpack/lib/hmr/HotModuleReplacement.runtime.js   => 创建 module.hot api
 * webpack/lib/MainTemplate.js
 * webpack/lib/web/JsonpTemplatePlugin.js
 * webpack/lib/web/JsonpChunkLoadingPlugin.js
 * webpack/lib/web/JsonpChunkLoadingRuntimeModule.js  => 组装生成 loadUpdateChunk  hmrDownloadManifest webpackJsonpCallback 等方法
 */

/******
 * 配置 webapck.config.js， 开启 hot ，输出 bundle.js
 */
 module.exports = {
  mode: 'development',
  context: path.resolve(__dirname, '../dev-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-dev-server'),
    filename: 'bundle.js',
  },
  devtool: false,
  devServer: {
    open: true,
    hot: true,
    contentBase: path.resolve(__dirname, '../dev-demo'),
  },
  plugins: [new HtmlWebpackPlugin()],
}

// 得到 bundle-dev-server/bundle.js
var __webpack_modules__ = {/**模块路径：模块内容 */} // 存放所有模块依赖
var __webpack_module_cache__ = {} // 缓存已加载的模块
function __webpack_require__(moduleId) {
  // Check if module is in cache
  if (__webpack_module_cache__[moduleId]) {
    return __webpack_module_cache__[moduleId].exports
  }
  // Create a new module (and put it into the cache)
  // 创建 module 变量
  var module = (__webpack_module_cache__[moduleId] = {
    id: moduleId,
    loaded: false,
    exports: {},
  })

  // Execute the module function
  var execOptions = {
    id: moduleId,
    module: module,
    factory: __webpack_modules__[moduleId],
    require: __webpack_require__,
  }

  // 注意这里的 handler ，在 HMR 中会传入
  __webpack_require__.i.forEach(function (handler) {
    handler(execOptions)
  })
  module = execOptions.module
  execOptions.factory.call(
    module.exports,
    module,
    module.exports,
    execOptions.require
  )

  // Flag the module as loaded
  module.loaded = true

  // Return the exports of the module
  return module.exports
} // webpack 自已实现的模块加载方法
__webpack_require__.m = __webpack_modules__
__webpack_require__.c = __webpack_module_cache__
__webpack_require__.i = []

__webpack_require__.i.push(function (options) {
  var module = options.module
  var require = createRequire(options.require, options.id)
  module.hot = createModuleHotObject(options.id, module)
  module.parents = currentParents
  module.children = []
  currentParents = []
  options.require = require
})

function createModuleHotObject(moduleId, me) {
  var hot = {
    // private stuff
    _acceptedDependencies: {},
    _declinedDependencies: {},
    _selfAccepted: false,
    _selfDeclined: false,
    _selfInvalidated: false,
    _disposeHandlers: [],
    _main: currentChildModule !== moduleId,
    _requireSelf: function () {
      currentParents = me.parents.slice()
      currentChildModule = moduleId
      __webpack_require__(moduleId)
    },

    // Module API
    active: true,
    accept: function (dep, callback) {
      if (dep === undefined) hot._selfAccepted = true
      else if (typeof dep === 'function') hot._selfAccepted = dep
      else if (typeof dep === 'object' && dep !== null)
        for (var i = 0; i < dep.length; i++)
          hot._acceptedDependencies[dep[i]] = callback || function () {}
      else hot._acceptedDependencies[dep] = callback || function () {}
    },
    decline: function (dep) {
      if (dep === undefined) hot._selfDeclined = true
      else if (typeof dep === 'object' && dep !== null)
        for (var i = 0; i < dep.length; i++)
          hot._declinedDependencies[dep[i]] = true
      else hot._declinedDependencies[dep] = true
    },
    dispose: function (callback) {
      hot._disposeHandlers.push(callback)
    },
    addDisposeHandler: function (callback) {
      hot._disposeHandlers.push(callback)
    },
    removeDisposeHandler: function (callback) {
      var idx = hot._disposeHandlers.indexOf(callback)
      if (idx >= 0) hot._disposeHandlers.splice(idx, 1)
    },
    invalidate: function () {
      this._selfInvalidated = true
      switch (currentStatus) {
        case 'idle':
          currentUpdateApplyHandlers = []
          Object.keys(__webpack_require__.hmrI).forEach(function (key) {
            __webpack_require__.hmrI[key](
              moduleId,
              currentUpdateApplyHandlers
            )
          })
          setStatus('ready')
          break
        case 'ready':
          Object.keys(__webpack_require__.hmrI).forEach(function (key) {
            __webpack_require__.hmrI[key](
              moduleId,
              currentUpdateApplyHandlers
            )
          })
          break
        case 'prepare':
        case 'check':
        case 'dispose':
        case 'apply':
          ;(queuedInvalidatedModules = queuedInvalidatedModules || []).push(
            moduleId
          )
          break
        default:
          // ignore requests in error states
          break
      }
    },

    // Management API
    check: hotCheck,
    apply: hotApply,
    status: function (l) {
      if (!l) return currentStatus
      registeredStatusHandlers.push(l)
    },
    addStatusHandler: function (l) {
      registeredStatusHandlers.push(l)
    },
    removeStatusHandler: function (l) {
      var idx = registeredStatusHandlers.indexOf(l)
      if (idx >= 0) registeredStatusHandlers.splice(idx, 1)
    },

    //inherit from previous dispose call
    data: currentModuleData[moduleId],
  }
  currentChildModule = undefined
  return hot
}

function hotCheck(applyOnUpdate) {
  if (currentStatus !== 'idle') {
    throw new Error('check() is only allowed in idle status')
  }
  setStatus('check')
  return __webpack_require__.hmrM().then(function (update) {
    if (!update) {
      setStatus(applyInvalidatedModules() ? 'ready' : 'idle')
      return null
    }

    setStatus('prepare')

    var updatedModules = []
    blockingPromises = []
    currentUpdateApplyHandlers = []

    return Promise.all(
      Object.keys(__webpack_require__.hmrC).reduce(function (
        promises,
        key // jsonp
      ) {
        __webpack_require__.hmrC[key](
          update.c,
          update.r,
          update.m,
          promises,
          currentUpdateApplyHandlers,
          updatedModules
        )
        return promises
      }, [])
    ).then(function () {
      return waitForBlockingPromises(function () {
        if (applyOnUpdate) {
          return internalApply(applyOnUpdate)
        } else {
          setStatus('ready')

          return updatedModules
        }
      })
    })
  })
}

__webpack_require__.hmrM = () => {
  if (typeof fetch === 'undefined')
    throw new Error('No browser support: need fetch API')
  return fetch(__webpack_require__.p + __webpack_require__.hmrF()).then(
    (response) => {
      if (response.status === 404) return // no update available
      if (!response.ok)
        throw new Error(
          'Failed to fetch update manifest ' + response.statusText
        )
      return response.json()
    }
  )
}

__webpack_require__.hmrC.jsonp = function (
  chunkIds,
  removedChunks,
  removedModules,
  promises,
  applyHandlers,
  updatedModulesList
) {
  applyHandlers.push(applyHandler)
  currentUpdateChunks = {}
  currentUpdateRemovedChunks = removedChunks
  currentUpdate = removedModules.reduce(function (obj, key) {
    obj[key] = false
    return obj
  }, {})
  currentUpdateRuntime = []
  chunkIds.forEach(function (chunkId) {
    if (
      __webpack_require__.o(installedChunks, chunkId) &&
      installedChunks[chunkId] !== undefined
    ) {
      promises.push(loadUpdateChunk(chunkId, updatedModulesList))
      currentUpdateChunks[chunkId] = true
    }
  })
  if (__webpack_require__.f) {
    __webpack_require__.f.jsonpHmr = function (chunkId, promises) {
      if (
        currentUpdateChunks &&
        !__webpack_require__.o(currentUpdateChunks, chunkId) &&
        __webpack_require__.o(installedChunks, chunkId) &&
        installedChunks[chunkId] !== undefined
      ) {
        promises.push(loadUpdateChunk(chunkId))
        currentUpdateChunks[chunkId] = true
      }
    }
  }
}

var currentUpdatedModulesList
var waitingUpdateResolves = {}
function loadUpdateChunk(chunkId) {
  return new Promise((resolve, reject) => {
    waitingUpdateResolves[chunkId] = resolve
    // start update chunk loading
    var url = __webpack_require__.p + __webpack_require__.hu(chunkId)
    // create error before stack unwound to get useful stacktrace later
    var error = new Error()
    var loadingEnded = (event) => {
      if (waitingUpdateResolves[chunkId]) {
        waitingUpdateResolves[chunkId] = undefined
        var errorType =
          event && (event.type === 'load' ? 'missing' : event.type)
        var realSrc = event && event.target && event.target.src
        error.message =
          'Loading hot update chunk ' +
          chunkId +
          ' failed.\n(' +
          errorType +
          ': ' +
          realSrc +
          ')'
        error.name = 'ChunkLoadError'
        error.type = errorType
        error.request = realSrc
        reject(error)
      }
    }
    __webpack_require__.l(url, loadingEnded)
  })
}



__webpack_require__.h = () => '5d318ec7d896868077ff' // 最新的 hash 值
__webpack_require__.hu = (chunkId) => { // 获取已更新的模块名
  return '' + chunkId + '.' + __webpack_require__.h() + '.hot-update.js'
}
__webpack_require__.hmrF = () => 'main.' + __webpack_require__.h() + '.hot-update.json' // 获取当前更新的模块映射 json  表
__webpack_require__.l = (url, done, key, chunkId) => { // 自定义 script 加载请求文件
  if (inProgress[url]) {
    inProgress[url].push(done)
    return
  }
  var script, needAttach
  if (key !== undefined) {
    var scripts = document.getElementsByTagName('script')
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i]
      if (s.getAttribute('src') == url) {
        script = s
        break
      }
    }
  }
  if (!script) {
    needAttach = true
    script = document.createElement('script')

    script.charset = 'utf-8'
    script.timeout = 120
    if (__webpack_require__.nc) {
      script.setAttribute('nonce', __webpack_require__.nc)
    }

    script.src = url
  }
  inProgress[url] = [done]
  var onScriptComplete = (prev, event) => {
    // avoid mem leaks in IE.
    script.onerror = script.onload = null
    clearTimeout(timeout)
    var doneFns = inProgress[url]
    delete inProgress[url]
    script.parentNode && script.parentNode.removeChild(script)
    doneFns && doneFns.forEach((fn) => fn(event))
    if (prev) return prev(event)
  }
  var timeout = setTimeout(
    onScriptComplete.bind(null, undefined, {
      type: 'timeout',
      target: script,
    }),
    120000
  )
  script.onerror = onScriptComplete.bind(null, script.onerror)
  script.onload = onScriptComplete.bind(null, script.onload)
  needAttach && document.head.appendChild(script)
}

function internalApply(options) {
  options = options || {}

  applyInvalidatedModules()

  var results = currentUpdateApplyHandlers.map(function (handler) {
    return handler(options)
  })
  currentUpdateApplyHandlers = undefined

  var errors = results
    .map(function (r) {
      return r.error
    })
    .filter(Boolean)

  if (errors.length > 0) {
    setStatus('abort')
    return Promise.resolve().then(function () {
      throw errors[0]
    })
  }

  // Now in "dispose" phase
  setStatus('dispose')

  results.forEach(function (result) {
    if (result.dispose) result.dispose()
  })

  // Now in "apply" phase
  setStatus('apply')

  var error
  var reportError = function (err) {
    if (!error) error = err
  }

  var outdatedModules = []
  results.forEach(function (result) {
    if (result.apply) {
      var modules = result.apply(reportError)
      if (modules) {
        for (var i = 0; i < modules.length; i++) {
          outdatedModules.push(modules[i])
        }
      }
    }
  })

  // handle errors in accept handlers and self accepted module load
  if (error) {
    setStatus('fail')
    return Promise.resolve().then(function () {
      throw error
    })
  }

  if (queuedInvalidatedModules) {
    return internalApply(options).then(function (list) {
      outdatedModules.forEach(function (moduleId) {
        if (list.indexOf(moduleId) < 0) list.push(moduleId)
      })
      return list
    })
  }

  setStatus('idle')
  return Promise.resolve(outdatedModules)
}

