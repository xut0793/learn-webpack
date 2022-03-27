# 入口

`webpack@4.x` 配合 `webpack-dev-server` 启动开发服务命令：`webpack-dev-server`
`webpack@5.x` 配合 `webpack-dev-server` 启动开发服务命令：`webpack serve`

## webpack@4.x `webpack-dev-server`

`webpack-dev-server` 使用强依赖于 `webpack` 和 `webpack-cli`。
```json
"name": "webpack-dev-server",
"version": "3.11.2",
"bin": {
  "webpack-dev-server": "bin/webpack-dev-server.js"
},
"peerDependencies": {
  "webpack": "^4.0.0 || ^5.0.0"
},
"peerDependenciesMeta": {
  "webpack-cli": {
    "optional": true
  }
},
```
run-script 命令中`"dev": "webpack-dev-server --open"` 命令执行的就是 `bin/webpack-dev-server.js` 文件。
```js
/**
 * 1. 依赖校验 webpack-dev-server  webpack-cli
*/
if (importLocal(__filename)) {
  debug('Using local install of webpack-dev-server');

  return;
}

try {
  require.resolve('webpack-cli');
} catch (err) {
  console.error('The CLI moved into a separate package: webpack-cli');
  console.error(
    "Please install 'webpack-cli' in addition to webpack itself to use the CLI"
  );
  console.error('-> When using npm: npm i -D webpack-cli');
  console.error('-> When using yarn: yarn add -D webpack-cli');

  process.exitCode = 1;
}

/**
 * 2. 注册 yargs 的命令参数
*/
yargs.usage(
  `${getVersions()}\nUsage:  https://webpack.js.org/configuration/dev-server/`
);
let configYargsPath = 'webpack-cli/bin/config/config-yargs'; // 依赖于 webpack-cli 的原因
require(configYargsPath)(yargs);
yargs.version(getVersions());
yargs.options(options);

/**
 * 3. 转化 webpack-dev-server 传入的命令行参数，比如：
 * a. 简写命令转换成详细属性值
 * b. 相对路径转换成绝对路径
 * c. webpack.config.js 配置文件读取等等
*/
const argv = yargs.argv;
let convertArgvPath = 'webpack-cli/bin/utils/convert-argv';
const config = require(convertArgvPath)(yargs, argv, {
  outputFilename: '/bundle.js',
});


/**
 * 4. 加工参数 processOptions，将上述转换的命令行转换的 config 转换成开启本地开发服务的 options 配置
*/
processOptions(config, argv, (config, options) => {
  startDevServer(config, options);
});

// /lib/utils/processOptions
function processOptions(config, argv, callback) {
  // 省略 processOptions {Promise}

  // 4.1 生成 webpack 实例化参数
  const options = createConfig(config, argv, { port: defaultPort });

  if (options.socket) {
    callback(config, options);
  } else {
    // 4.2 当传入的端口号或默认端口号被占用时，查找一个可用的端口号
    findPort(options.port)
      .then((port) => {
        options.port = port;
        callback(config, options);
      })
      .catch((err) => {
        console.error(err.stack || err);
        process.exit(1);
      });
  }
}

/**
 * 5. 开启开发服务器
*/
function startDevServer(config, options) {
  const log = createLogger(options);

  let compiler;

  // 5.1 使用 processoptions 后的配置参数实例化 webpack
  try {
    compiler = webpack(config);
  } catch (err) {
    if (err instanceof webpack.WebpackOptionsValidationError) {
      log.error(colors.error(options.stats.colors, err.message));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    throw err;
  }

  // 5.2 实例化一个本地服务器实例
  try {
    server = new Server(compiler, options, log);
    serverData.server = server;
  } catch (err) {
    if (err.name === 'ValidationError') {
      log.error(colors.error(options.stats.colors, err.message));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    throw err;
  }

  // 5.3 options.socket 默认是 true，本地开发服务器需要开启一个 webSocket 服务
  if (options.socket) {
    // 省略部分代码
    server.listen(options.socket, options.host, (err) => {
      if (err) {
        throw err;
      }
    });
  } else {
    server.listen(options.port, options.host, (err) => {
      if (err) {
        throw err;
      }
    });
  }
}
```

关键语句：`server = new Server(compiler, options, log);`
引用：`const Server = require('../lib/Server');`

## 延伸：查找可用端口号和监听`Ctrl+c`退出的实现

- 如何查找一个可用的端口号，依赖于第三库：`findport.js`
```js
// 4.2 如果 prot 端口号被占用，会重试3次查找可用的端口号 findPort(options.port)
// /lib/utils/findPort.js
function findPort(port) {
  if (port) {
    return Promise.resolve(port);
  }

  // Try to find unused port and listen on it for 3 times,
  // 尝试重试3次找一个未使用的端口并监听它，
  // 依赖于第三库：1. p-retry.js => retry.js 2. portfinder.js
  // 有兴趣可以继续深入了解如何查找一个可用的端口号 portfinder
  const defaultPortRetry = defaultTo(
    tryParseInt(process.env.DEFAULT_PORT_RETRY),
    3
  );

  return pRetry(runPortFinder, { retries: defaultPortRetry });
}

function runPortFinder() {
  return new Promise((resolve, reject) => {
    portfinder.basePort = defaultPort;
    portfinder.getPort((error, port) => {
      if (error) {
        return reject(error);
      }

      return resolve(port);
    });
  });
}
```
- 如何监听服务退出信息，如 `ctrl + c` 停止服务
```js
// webpack-dev-server.js
const setupExitSignals = require('../lib/utils/setupExitSignals');
let server;
const serverData = {
  server: null,
};
setupExitSignals(serverData);

server = new Server(compiler, options, log);
serverData.server = server;
```
```js
// /lib/utils/setupExitSignals.js
// shell 中 ctrl + c 会向对当前前台进程,和他的所在的进程组的每个进程都发送 SIGINT 信号
//  SIGTERM 信号由 shell 中的 kill 函数发出
const signals = ['SIGINT', 'SIGTERM'];

function setupExitSignals(serverData) {
  signals.forEach((signal) => {
    // 监听进程信号事件，如果有开启服务，则调用服务的 close 事件，并在 close 事件的回调中退出当前进程 process.exit。如果没有开启服务，直接退出当前进程。
    process.on(signal, () => {
      if (serverData && serverData.server) {
        serverData.server.close(() => {
          process.exit();
        });
      } else {
        process.exit();
      }
    });
  });
}
```

## webpack@5.x `webpack serve`

webpack@5.x 启动本地开发服务的命令变更为 `webpack serve`，这样命令形式较为统一，简单，但内在实现逻辑会在 `webpack / webpack-cli / webpack-dev-server` 三个依赖包中跳跃。

```js
// webpack/bin/webpack.js
const cli = {
	name: "webpack-cli",
	package: "webpack-cli",
	binName: "webpack-cli",
	installed: isInstalled("webpack-cli"),
	url: "https://github.com/webpack/webpack-cli"
};

if (!cli.installed) {
  // 如果 webpack-cli 未安装，使用 node 原生的 readline 询问用户是否安装，如果是，安装成功后执行 runCli(cli);
} else {
  runCli(cli);
}

const runCli = cli => {
	const path = require("path");
	const pkgPath = require.resolve(`${cli.package}/package.json`);
	const pkg = require(pkgPath);
	require(path.resolve(path.dirname(pkgPath), pkg.bin[cli.binName])); // 执行 webpack-cli 的 bin 文件
};
```
`webpack-cli` 强依赖于 `webpack`，以及 `@webpack-cli` 库
```json
"name": "webpack-cli",
"version": "4.5.0"
"bin": {
  "webpack-cli": "bin/cli.js"
},
"peerDependencies": {
  "webpack": "4.x.x || 5.x.x"
},
"peerDependenciesMeta": {
  "@webpack-cli/generators": {
    "optional": true
  },
  "@webpack-cli/init": {
    "optional": true
  },
  "@webpack-cli/migrate": {
    "optional": true
  },
  "webpack-bundle-analyzer": {
    "optional": true
  },
  "webpack-dev-server": {
    "optional": true
  }
},
```
`webpack-cli` 中 `bin/cli.js`
```js
// webpack-cli/bin/cli.js

// 校验本地安装 `webpack-cli`
if (importLocal(__filename)) {
    return;
}

const Module = require('module');
const originalModuleCompile = Module.prototype._compile;
// 校验是否已安装 webpack
if (utils.packageExists('webpack')) {
    runCLI(process.argv, originalModuleCompile);
} else {
    const { promptInstallation, logger, colors } = utils;

    // 如果没有安装，则询问用户是否安装 webpack ，如果是，安装成功后执行 runCLI
    // webpack-cli/lib/utils/prompt-installation.js 使用了 enquirer.js 库，同类型更早的的 inquirer.js 
    promptInstallation('webpack', () => {
        utils.logger.error(`It looks like ${colors.bold('webpack')} is not installed.`);
    })
        .then(() => {
            logger.success(`${colors.bold('webpack')} was installed successfully.`);

            runCLI(process.argv, originalModuleCompile);
        })
        .catch(() => {
            logger.error(`Action Interrupted, Please try once again or install ${colors.bold('webpack')} manually.`);

            process.exit(2);
        });
}
```
`const runCLI = require('../lib/bootstrap');`
```js
// webpack-cli/lib/bootstrap.js
const WebpackCLI = require('./webpack-cli');
const utils = require('./utils');

const runCLI = async (args, originalModuleCompile) => {
    try {
        const cli = new WebpackCLI();

        cli._originalModuleCompile = originalModuleCompile;

        await cli.run(args);
    } catch (error) {
        utils.logger.error(error);
        process.exit(2);
    }
};

module.exports = runCLI;
```
关键语句：`const cli = new WebpackCLI();` 和 `await cli.run(args);`
```js
// webpack-cli/lib/webpack-cli.js
const { program } = require('commander');
const utils = require('./utils');
class WebpackCLI {
  constructor() {
    // Global
    this.webpack = require('webpack');
    this.logger = utils.logger;
    this.utils = utils;

    // Initialize program
    this.program = program;
    this.program.name('webpack');
    this.program.configureOutput({
        writeErr: this.logger.error,
        outputError: (str, write) => write(`Error: ${this.utils.capitalizeFirstLetter(str.replace(/^error:/, '').trim())}`),
    });
  }

  // run 主要是对 commander 命令行参数的设置，这里关键 webpack serve 命令的执行
  async run(args, parseOptions) {
    // 省略其它内置命令，如 info init plugin

    // Built-in external commands
    const externalBuiltInCommandsInfo = [
      {
          name: 'serve [entries...]',
          alias: 's',
          pkg: '@webpack-cli/serve', // 可以看到 serve 命令又依赖于 @webpack-cli 依赖
      },
    ]

    const knownCommands = [
      buildCommandOptions,
      watchCommandOptions,
      versionCommandOptions,
      helpCommandOptions,
      ...externalBuiltInCommandsInfo,
    ];

    // 向 commander.program 注册命令，及命令的回调执行函数
    this.program.action(async (options, program) => {
      const { operands, unknown } = this.program.parseOptions(program.args);
      const hasOperand = typeof operands[0] !== 'undefined';
      const operand = hasOperand ? operands[0] : defaultCommandToRun;

      if (options.help || isCommand(operand, helpCommandOptions)) { /* 省略 */ }
      if (options.version || isCommand(operand, versionCommandOptions)) { /* 省略 */ }

      let commandToRun = operand;
      let commandOperands = operands.slice(1);

      if (isKnownCommand(commandToRun)) {
        await loadCommandByName(commandToRun, true);
      } else {
        // 如果都不是，使用 fastest-levenshtein.js 库查找一个相似的已知命令提示用户
      }
    })

    const loadCommandByName = async (commandName, allowToInstall = false) => {
      const isBuildCommandUsed = isCommand(commandName, buildCommandOptions);
      const isWatchCommandUsed = isCommand(commandName, watchCommandOptions);

      if (isBuildCommandUsed || isWatchCommandUsed) {
          //webpack  build 或 webpack watch 命令注册
      } else if (isCommand(commandName, helpCommandOptions)) {
          // webpack help
          this.makeCommand(helpCommandOptions, [], () => {});
      } else if (isCommand(commandName, versionCommandOptions)) {
          // webpack version
          this.makeCommand(versionCommandOptions, [], () => {});
      } else {
        // webpack serve 命令定义在 externalBuiltInCommandsInfo 中,
        // 所以此时 builtInExternalCommandInfo = {
        //   name: 'serve [entries...]',
        //   alias: 's',
        //   pkg: '@webpack-cli/serve',
        // }
        const builtInExternalCommandInfo = externalBuiltInCommandsInfo.find(
            (externalBuiltInCommandInfo) =>
                getCommandName(externalBuiltInCommandInfo.name) === commandName ||
                (Array.isArray(externalBuiltInCommandInfo.alias)
                    ? externalBuiltInCommandInfo.alias.includes(commandName)
                    : externalBuiltInCommandInfo.alias === commandName),
        );

        let pkg;

        if (builtInExternalCommandInfo) {
            ({ pkg } = builtInExternalCommandInfo); // pkg = '@webpack-cli/serve',
        } else {
            pkg = commandName;
        }

        if (pkg !== 'webpack-cli' && !this.utils.packageExists(pkg)) {
          // 提示用户安装
        }

        let loadedCommand;

        try {
            loadedCommand = require(pkg); // 加载 @webpack-cli/serve
        } catch (error) {
            // Ignore, command is not installed
            return;
        }

        if (loadedCommand.default) {
            loadedCommand = loadedCommand.default;
        }

        let command;

        try {
            command = new loadedCommand();

            await command.apply(this);
        } catch (error) {
            this.logger.error(`Unable to load '${pkg}' command`);
            this.logger.error(error);
            process.exit(2);
        }
      }
  };
  }
}
```
关键语句：`command = new loadedCommand();` 和 `await command.apply(this);`
引用：`@webpack-cli/serve`

```js
class ServeCommand {
  async apply(cli) {
    // 注册 webpack serve 命令
    await cli.makeCommand(
      {
        name: 'serve [entries...]',
        alias: 's',
        description: 'Run the webpack dev server.',
        usage: '[entries...] [options]',
        pkg: '@webpack-cli/serve',
        dependencies: ['webpack-dev-server'],
      },
      () => {
        let devServerFlags = [];
        try {
            devServerFlags = require('webpack-dev-server/bin/cli-flags').devServer;
        } catch (error) {
            logger.error(`You need to install 'webpack-dev-server' for running 'webpack serve'.\n${error}`);
            process.exit(2);
        }
        const builtInOptions = cli.getBuiltInOptions().filter((option) => option.name !== 'watch');
        return [...builtInOptions, ...devServerFlags];
      },
      async (entries, options) => {
        const builtInOptions = cli.getBuiltInOptions();
        let devServerFlags = [];
        try {
          devServerFlags = require('webpack-dev-server/bin/cli-flags').devServer;
        } catch (error) {
        }
        const webpackOptions = {};
        const devServerOptions = {};
        const processors = [];

        // 省略处理一系列 options 的代码

        // 创建 webpack 实例 compiler
        const compiler = await cli.createCompiler(webpackOptions);
        if (!compiler) {
            return;
        }
        let servers;
        try {
          // 开启本地服务器
          servers = await startDevServer_1.default(compiler, devServerOptions, options, logger);
        } catch (error) {
          if (cli.isValidationError(error)) {
              logger.error(error.message);
          }
          else {
              logger.error(error);
          }
          process.exit(2);
        }
      }
    )
  }
}
```
关键代码`servers = await startDevServer_1.default(compiler, devServerOptions, options, logger);`
引用：`const startDevServer_1 = __importDefault(require("./startDevServer"));`

```js
// @webapck-cli/serve/lib/startDevServer.js
async function startDevServer(compiler, devServerCliOptions, cliOptions, logger) {
  let devServerVersion, Server, findPort;
  try {
    devServerVersion = require('webpack-dev-server/package.json').version;
    Server = require('webpack-dev-server/lib/Server');
    findPort = require('webpack-dev-server/lib/utils/findPort');
  } catch (err) {
    logger.error(`You need to install 'webpack-dev-server' for running 'webpack serve'.\n${err}`);
    process.exit(2);
  }

  const isMultiCompiler = Boolean(compiler.compilers);
  let compilersWithDevServerOption;
  if (isMultiCompiler) {
    compilersWithDevServerOption = compiler.compilers.filter((compiler) => compiler.options.devServer);
    if (compilersWithDevServerOption.length === 0) {
        compilersWithDevServerOption = [compiler.compilers[0]];
    }
  }
  else {
    compilersWithDevServerOption = [compiler];
  }

  const isDevServer4 = devServerVersion.startsWith('4');
  const usedPorts = [];
  const devServersOptions = [];
  for (const compilerWithDevServerOption of compilersWithDevServerOption) {
    // 省略代码：解析 option
    devServersOptions.push({ compiler, options });
  }

  const servers = [];
  for (const devServerOptions of devServersOptions) {
      const { compiler, options } = devServerOptions;
      const server = new Server(compiler, options);
      server.listen(options.port, options.host, (error) => {
          if (error) {
              throw error;
          }
      });
      servers.push(server);
  }
  return servers;
}
```
关键语句：`const server = new Server(compiler, options);`
引用：`webpack-dev-server/lib/Server`

## 延伸：错误命令提示相似的命令 `fastest-levenshtein.js`
```js
if (this.utils.levenshtein.distance(name, option.long.slice(2)) < 3) {
    this.logger.error(`Did you mean '--${option.name()}'?`);
}
```



