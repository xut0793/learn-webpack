/*
 * @Author       : xut
 * @Date         : 2021-08-15 08:56:52
 * @LastEditTime : 2021-08-15 14:53:11
 * @LastEditors  : xut
 * @Description  : wepback-dev-server 中代理的功能实现，依赖于 http-proxy
 */
// 配置
module.exports = {
  //...
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}

// 源码
const httpProxyMiddleware = require('http-proxy-middleware')

class Server {
  constructor(compiler, options = {}, _log) {
    // 省略
    this.setupFeatures()
  }
  setupFeatures() {
    const features = {
      // 省略
      proxy: () => {
        if (this.options.proxy) {
          this.setupProxyFeature()
        }
      },
    }

    const runnableFeatures = []
    runnableFeatures.push('setup', 'before', 'headers', 'middleware')

    if (this.options.proxy) {
      runnableFeatures.push('proxy', 'middleware')
    }
    // 省略

    ;(this.options.features || runnableFeatures).forEach((feature) => {
      features[feature]()
    })
  }

  setupProxyFeature() {
    /**
     * Assume a proxy configuration specified as:
     * proxy: {
     *   'context': { options }
     * }
     * OR
     * proxy: {
     *   'context': string
     *    'target' string
     *     ...
     * }
     */
    if (!Array.isArray(this.options.proxy)) {
      if (Object.prototype.hasOwnProperty.call(this.options.proxy, 'target')) {
        this.options.proxy = [this.options.proxy]
      } else {
        this.options.proxy = Object.keys(this.options.proxy).map((context) => {
          let proxyOptions
          // For backwards compatibility reasons.
          const correctedContext = context
            .replace(/^\*$/, '**')
            .replace(/\/\*$/, '')

          if (typeof this.options.proxy[context] === 'string') {
            proxyOptions = {
              context: correctedContext,
              target: this.options.proxy[context],
            }
          } else {
            proxyOptions = Object.assign({}, this.options.proxy[context])
            proxyOptions.context = correctedContext
          }

          proxyOptions.logLevel = proxyOptions.logLevel || 'warn'

          return proxyOptions
        })
      }
    }

    const getProxyMiddleware = (proxyConfig) => {
      const context = proxyConfig.context || proxyConfig.path

      // It is possible to use the `bypass` method without a `target`.
      // However, the proxy middleware has no use in this case, and will fail to instantiate.
      if (proxyConfig.target) {
        return httpProxyMiddleware(context, proxyConfig)
      }
    }
    /**
     * Assume a proxy configuration specified as:
     * proxy: [
     *   {
     *     context: ...,
     *     ...options...
     *   },
     *   // or:
     *   function() {
     *     return {
     *       context: ...,
     *       ...options...
     *     };
     *   }
     * ]
     */
    this.options.proxy.forEach((proxyConfigOrCallback) => {
      let proxyMiddleware

      let proxyConfig =
        typeof proxyConfigOrCallback === 'function'
          ? proxyConfigOrCallback()
          : proxyConfigOrCallback

      proxyMiddleware = getProxyMiddleware(proxyConfig)

      if (proxyConfig.ws) {
        this.websocketProxies.push(proxyMiddleware)
      }

      const handle = (req, res, next) => {
        if (typeof proxyConfigOrCallback === 'function') {
          const newProxyConfig = proxyConfigOrCallback()

          if (newProxyConfig !== proxyConfig) {
            proxyConfig = newProxyConfig
            proxyMiddleware = getProxyMiddleware(proxyConfig)
          }
        }

        // - Check if we have a bypass function defined
        // - In case the bypass function is defined we'll retrieve the
        // bypassUrl from it otherwise bypassUrl would be null
        const isByPassFuncDefined = typeof proxyConfig.bypass === 'function'
        const bypassUrl = isByPassFuncDefined
          ? proxyConfig.bypass(req, res, proxyConfig)
          : null

        if (typeof bypassUrl === 'boolean') {
          // skip the proxy
          req.url = null
          next()
        } else if (typeof bypassUrl === 'string') {
          // byPass to that url
          req.url = bypassUrl
          next()
        } else if (proxyMiddleware) {
          return proxyMiddleware(req, res, next)
        } else {
          next()
        }
      }

      // 向 app 实例注册代理中间件，主要逻辑是 proxyMiddleware(req, res, next);
      this.app.use(handle)
      // Also forward error requests to the proxy so it can handle them.
      this.app.use((error, req, res, next) => handle(req, res, next))
    })
  }
}

/******
 * 关键步骤：
 * const getProxyMiddleware = (proxyConfig) => {  return httpProxyMiddleware(context, proxyConfig)}}
 * const handle = (req, res, next) => { return proxyMiddleware(req, res, next); }
 */

// const httpProxyMiddleware = require('http-proxy-middleware');
// http-proxy-middleware/index.js
var HPM = require('./lib')
module.exports = function (context, opts) {
  return new HPM(context, opts)
}

// http-proxy-middleware/lib/index.js
module.exports = function HttpProxyMiddleware(context, opts) {
  var config = configFactory.createConfig(context, opts) // 主要是对 target 的处理
  var proxyOptions = config.options

  // create proxy
  var proxy = httpProxy.createProxyServer({})
  // returns undefined when "pathRewrite" is not provided 没有提供 pathWewrite 时返回 undefined
  var pathRewriter = PathRewriter.create(proxyOptions.pathRewrite)
  // attach handler to http-proxy events 添加代理事件
  handlers.init(proxy, proxyOptions)

  return middleware

  /**
   * 1. 判断当前 req.url 是不是在需要代理的路径内
   * 2. 如果是，生成代理需要的配置 activeProxyOptions
   * 3. 执行代理 proxy.web()
   */
  function middleware(req, res, next) {
    if (shouldProxy(config.context, req)) {
      var activeProxyOptions = prepareProxyRequest(req)
      proxy.web(req, res, activeProxyOptions)
    } else {
      next()
    }
  }
}

// 先看下代理配置被处理成 proxyOptions是怎样的结构
// var config = configFactory.createConfig(context, opts)
// var proxyOptions = config.options
module.exports = {
  createConfig: createConfig,
}
function createConfig(context, opts) {
  // structure of config object to be returned 要返回的配置对象的结构
  var config = {
    context: undefined,
    options: {},
  }

  // app.use('/api', proxy({target:'http://localhost:9000'}));
  // isContextless 是 _.isPlainObject(context) && _.isEmpty(opts)
  if (isContextless(context, opts)) {
    config.context = '/'
    config.options = _.assign(config.options, context)

    // app.use('/api', proxy('http://localhost:9000'));
    // app.use(proxy('http://localhost:9000/api'));
  } else if (isStringShortHand(context)) {
    var oUrl = url.parse(context)
    var target = [oUrl.protocol, '//', oUrl.host].join('')

    config.context = oUrl.pathname || '/'
    config.options = _.assign(config.options, { target: target }, opts)

    if (oUrl.protocol === 'ws:' || oUrl.protocol === 'wss:') {
      config.options.ws = true
    }
    // app.use('/api', proxy({target:'http://localhost:9000'}));
  } else {
    config.context = context
    config.options = _.assign(config.options, opts)
  }

  if (!config.options.target) {
    throw new Error(ERRORS.ERR_CONFIG_FACTORY_TARGET_MISSING)
  }
  // 省略
  return config
}

// 步骤1：shouldProxy(config.context, req)
/**
 * Determine whether request should be proxied.
 * 确定是否应该代理请求
 * @private
 * @param  {String} context [description]
 * @param  {Object} req     [description]
 * @return {Boolean}
 */
function shouldProxy(context, req) {
  var path = req.originalUrl || req.url
  return contextMatcher.match(context, path, req)
}
// var contextMatcher = require('./context-matcher')
module.exports = {
  match: matchContext,
}
function matchContext(context, uri, req) {
  // single path context: '/api'
  if (isStringPath(context)) {
    return matchSingleStringPath(context, uri)
  }

  // single glob path context: /api/*
  if (isGlobPath(context)) {
    return matchSingleGlobPath(context, uri)
  }

  // multi path context: ['/auth', '/api'],
  if (Array.isArray(context)) {
    if (context.every(isStringPath)) {
      return matchMultiPath(context, uri)
    }
    if (context.every(isGlobPath)) {
      return matchMultiGlobPath(context, uri)
    }

    throw new Error(ERRORS.ERR_CONTEXT_MATCHER_INVALID_ARRAY)
  }

  // custom matching
  if (_.isFunction(context)) {
    var pathname = getUrlPathName(uri)
    return context(pathname, req)
  }

  throw new Error(ERRORS.ERR_CONTEXT_MATCHER_GENERIC)
}

/**
 * @param  {String} context '/api'
 * @param  {String} uri     'http://example.org/api/b/c/d.html'
 * @return {Boolean}
 */
function matchSingleStringPath(context, uri) {
  var pathname = getUrlPathName(uri) // return uri && url.parse(uri).pathname
  return pathname.indexOf(context) === 0
}

function matchSingleGlobPath(pattern, uri) {
  var pathname = getUrlPathName(uri)
  var matches = micromatch(pathname, pattern)
  return matches && matches.length > 0
}

function matchMultiGlobPath(patternList, uri) {
  return matchSingleGlobPath(patternList, uri)
}

/**
 * @param  {String} contextList ['/api', '/ajax']
 * @param  {String} uri     'http://example.org/api/b/c/d.html'
 * @return {Boolean}
 */
function matchMultiPath(contextList, uri) {
  for (var i = 0; i < contextList.length; i++) {
    var context = contextList[i]
    if (matchSingleStringPath(context, uri)) {
      return true
    }
  }
  return false
}

/**
 * Parses URI and returns RFC 3986 path
 *
 * @param  {String} uri from req.url
 * @return {String}     RFC 3986 path
 */
function getUrlPathName(uri) {
  return uri && url.parse(uri).pathname
}

function isStringPath(context) {
  return _.isString(context) && !isGlob(context)
}

function isGlobPath(context) {
  return isGlob(context)
}

// 步骤2：var activeProxyOptions = prepareProxyRequest(req)
/**
 * 主要是调用 option.router and option.pathRewrite 处理代理的目标路径 target，和重写代理路径，即 req.url
 * @param {Object} req
 * @return {Object} proxy options
 */
function prepareProxyRequest(req) {
  /**
   * 如果 req.url = '/api/users'
   * 在express中，如果是这样匹配 router.get(/api, handler)，则此时
   * 则 req.url 是 '/users', req.originalUrl 才是完整请求 '/api/users'
   */
  req.url = req.originalUrl || req.url

  // store uri before it gets rewritten for logging
  var originalPath = req.url
  var newProxyOptions = _.assign({}, proxyOptions)

  // Apply in order:
  // 1. option.router
  // 2. option.pathRewrite
  __applyRouter(req, newProxyOptions)
  __applyPathRewrite(req, pathRewriter)

  return newProxyOptions
}

// Modify option.target when router present.
// 当路由器出现时锁定目标时，修改目标配置
function __applyRouter(req, options) {
  var newTarget

  if (options.router) {
    newTarget = Router.getTarget(req, options) // 获取配置的 target

    if (newTarget) {
      options.target = newTarget
    }
  }
}

// rewrite path 重写请求url
// proxy: {
//   '/api': {
//     target: 'http://localhost:3000',
//     pathRewrite: { '^/api': '' },
//   },
// },
function __applyPathRewrite(req, pathRewriter) {
  if (pathRewriter) {
    // pathRewriter 主要是根据配置正则替换，核心代码类似于：
    // req.url = req.url.replace(rule.regex, rule.value)
    var path = pathRewriter(req.url, req)

    if (typeof path === 'string') {
      req.url = path
    } else {
      logger.info('[HPM] pathRewrite: No rewritten path found. (%s)', req.url)
    }
  }
}

// 步骤3：
// var proxy = httpProxy.createProxyServer({})
// proxy.web(req, res, activeProxyOptions)
// http-proxy/index.js
module.exports = require('./lib/http-proxy')
// http-proxy/lib/http-proxy.js
var ProxyServer = require('./http-proxy/index.js').Server

function createProxyServer(options) {
  /*
   *  `options` is needed and it must have the following layout:
   *
   *  {
   *    target : <url string to be parsed with the url module>
   *    forward: <url string to be parsed with the url module>
   *    agent  : <object to be passed to http(s).request>
   *    ssl    : <object to be passed to https.createServer()>
   *    ws     : <true/false, if you want to proxy websockets>
   *    xfwd   : <true/false, adds x-forward headers>
   *    secure : <true/false, verify SSL certificate>
   *    toProxy: <true/false, explicitly specify if we are proxying to another proxy>
   *    prependPath: <true/false, Default: true - specify whether you want to prepend the target's path to the proxy path>
   *    ignorePath: <true/false, Default: false - specify whether you want to ignore the proxy path of the incoming request>
   *    localAddress : <Local interface string to bind for outgoing connections>
   *    changeOrigin: <true/false, Default: false - changes the origin of the host header to the target URL>
   *    preserveHeaderKeyCase: <true/false, Default: false - specify whether you want to keep letter case of response header key >
   *    auth   : Basic authentication i.e. 'user:password' to compute an Authorization header.
   *    hostRewrite: rewrites the location hostname on (201/301/302/307/308) redirects, Default: null.
   *    autoRewrite: rewrites the location host/port on (201/301/302/307/308) redirects based on requested host/port. Default: false.
   *    protocolRewrite: rewrites the location protocol on (201/301/302/307/308) redirects to 'http' or 'https'. Default: null.
   *  }
   *
   *  NOTE:
   *    `options.ws` and `options.ssl` are optional.
   *    `options.target and `options.forward` cannot be both missing
   */

  return new ProxyServer(options)
}
ProxyServer.createProxyServer = createProxyServer
ProxyServer.createServer = createProxyServer
ProxyServer.createProxy = createProxyServer
module.exports = ProxyServer

// http-proxy/lib/http-proxy/index.js
var httpProxy = module.exports
httpProxy.Server = ProxyServer

function ProxyServer(options) {
  EE3.call(this) // 继承 eventemitter3 事件机制，可以注册事件监听

  options = options || {}
  options.prependPath = options.prependPath === false ? false : true

  this.web = this.proxyRequest = createRightProxy('web')(options)
  this.ws = this.proxyWebsocketRequest = createRightProxy('ws')(options)
  this.options = options

  /**
   * webPasses = [deleteLength, timeout, Xheaders, stream]
   */
  this.webPasses = Object.keys(web).map(function (pass) {
    return web[pass]
  })

  this.wsPasses = Object.keys(ws).map(function (pass) {
    return ws[pass]
  })

  this.on('error', this.onError, this)
}

function createRightProxy(type) {
  return function (options) {
    return function (req, res /*, [head], [opts] */) {
      var passes = type === 'ws' ? this.wsPasses : this.webPasses,
        args = [].slice.call(arguments),
        cntr = args.length - 1,
        head,
        cbl

      /* optional args parse begin */
      if (typeof args[cntr] === 'function') {
        cbl = args[cntr]

        cntr--
      }

      var requestOptions = options
      if (!(args[cntr] instanceof Buffer) && args[cntr] !== res) {
        //Copy global options
        requestOptions = extend({}, options)
        //Overwrite with request options
        extend(requestOptions, args[cntr])

        cntr--
      }

      if (args[cntr] instanceof Buffer) {
        head = args[cntr]
      }

      /* optional args parse end */

      ;['target', 'forward'].forEach(function (e) {
        if (typeof requestOptions[e] === 'string')
          requestOptions[e] = parse_url(requestOptions[e])
      })

      if (!requestOptions.target && !requestOptions.forward) {
        return this.emit(
          'error',
          new Error('Must provide a proper URL as target')
        )
      }

      for (var i = 0; i < passes.length; i++) {
        /**
         * Call of passes functions
         * pass(req, res, options, head)
         *
         * In WebSockets case the `res` variable
         * refer to the connection socket
         * pass(req, socket, options, head)
         */
        //  webPasses = [deleteLength, timeout, Xheaders, stream]
        if (passes[i](req, res, requestOptions, head, this, cbl)) {
          // passes can return a truthy value to halt the loop
          break
        }
      }
    }
  }
}

// 关键代码
// this.webPasses = Object.keys(web).map(function(pass) {
//   return web[pass];
// });
// passes[i](req, res, requestOptions, head, this, cbl)

// http-proxy/lib/http-proxy/passes.js
var httpNative = require('http'),
  httpsNative = require('https')

var nativeAgents = { http: httpNative, https: httpsNative }

module.exports = {
  /**
   * Sets `content-length` to '0' if request is of DELETE type.
   * 当请求是 delete 和 options 时，将 content-length 设为0，且删除transfer-encoding 请求头字段
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  deleteLength: function deleteLength(req, res, options) {
    if (
      (req.method === 'DELETE' || req.method === 'OPTIONS') &&
      !req.headers['content-length']
    ) {
      req.headers['content-length'] = '0'
      delete req.headers['transfer-encoding']
    }
  },

  /**
   * Sets timeout in request socket if it was specified in options.
   * 如果有 options.timeout，设置了请求超时
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  timeout: function timeout(req, res, options) {
    if (options.timeout) {
      req.socket.setTimeout(options.timeout)
    }
  },

  /**
   * Sets `x-forwarded-*` headers if specified in config.
   * 如果配置了 options.xfwd 字段，则设置 x-forwarded-for / x-forwarded-port / x-forwarded-proto 请求头字段
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  XHeaders: function XHeaders(req, res, options) {
    if (!options.xfwd) return

    var encrypted = req.isSpdy || common.hasEncryptedConnection(req)
    var values = {
      for: req.connection.remoteAddress || req.socket.remoteAddress,
      port: common.getPort(req),
      proto: encrypted ? 'https' : 'http',
    }

    ;['for', 'port', 'proto'].forEach(function (header) {
      req.headers['x-forwarded-' + header] =
        (req.headers['x-forwarded-' + header] || '') +
        (req.headers['x-forwarded-' + header] ? ',' : '') +
        values[header]
    })

    req.headers['x-forwarded-host'] =
      req.headers['x-forwarded-host'] || req.headers['host'] || ''
  },

  /**
   * Does the actual proxying. If `forward` is enabled fires up
   * a ForwardStream, same happens for ProxyStream. The request
   * just dies otherwise.
   * 真正的请求代理处理
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  stream: function stream(req, res, options, _, server, clb) {
    // And we begin!
    server.emit('start', req, res, options.target || options.forward)

    var agents = options.followRedirects ? followRedirects : nativeAgents
    var http = agents.http
    var https = agents.https

    if (options.forward) {
      // If forward enable, so just pipe the request
      var forwardReq = (
        options.forward.protocol === 'https:' ? https : http
      ).request(
        common.setupOutgoing(options.ssl || {}, options, req, 'forward')
      )

      // error handler (e.g. ECONNRESET, ECONNREFUSED)
      // Handle errors on incoming request as well as it makes sense to
      var forwardError = createErrorHandler(forwardReq, options.forward)
      req.on('error', forwardError)
      forwardReq.on('error', forwardError)
      ;(options.buffer || req).pipe(forwardReq)
      if (!options.target) {
        return res.end()
      }
    }

    // Request initalization
    var proxyReq = (
      options.target.protocol === 'https:' ? https : http
    ).request(common.setupOutgoing(options.ssl || {}, options, req))

    // Enable developers to modify the proxyReq before headers are sent
    proxyReq.on('socket', function (socket) {
      if (server && !proxyReq.getHeader('expect')) {
        server.emit('proxyReq', proxyReq, req, res, options)
      }
    })

    // allow outgoing socket to timeout so that we could
    // show an error page at the initial request
    if (options.proxyTimeout) {
      proxyReq.setTimeout(options.proxyTimeout, function () {
        proxyReq.abort()
      })
    }

    // Ensure we abort proxy if request is aborted
    req.on('aborted', function () {
      proxyReq.abort()
    })

    // handle errors in proxy and incoming request, just like for forward proxy
    var proxyError = createErrorHandler(proxyReq, options.target)
    req.on('error', proxyError)
    proxyReq.on('error', proxyError)

    function createErrorHandler(proxyReq, url) {
      return function proxyError(err) {
        if (req.socket.destroyed && err.code === 'ECONNRESET') {
          server.emit('econnreset', err, req, res, url)
          return proxyReq.abort()
        }

        if (clb) {
          clb(err, req, res, url)
        } else {
          server.emit('error', err, req, res, url)
        }
      }
    }

    ;(options.buffer || req).pipe(proxyReq)

    proxyReq.on('response', function (proxyRes) {
      if (server) {
        server.emit('proxyRes', proxyRes, req, res)
      }

      if (!res.headersSent && !options.selfHandleResponse) {
        for (var i = 0; i < web_o.length; i++) {
          if (web_o[i](req, res, proxyRes, options)) {
            break
          }
        }
      }

      if (!res.finished) {
        // Allow us to listen when the proxy has completed
        proxyRes.on('end', function () {
          if (server) server.emit('end', req, res, proxyRes)
        })
        // We pipe to the response unless its expected to be handled by the user
        if (!options.selfHandleResponse) proxyRes.pipe(res)
      } else {
        if (server) server.emit('end', req, res, proxyRes)
      }
    })
  },
}
