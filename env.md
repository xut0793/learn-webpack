# vue 项目环境变量的设置

在 vue 项目开发中，特别是 webpack 配置文件中经常会使用 `process.env.NODE_ENV` 或者 `process.env.VUE_APP_XXX` 这样变量来判断环境。

在使用中常见的疑问：
- 一步步认识 process 、 process.env 、process.env.NODE_ENV
- 在 run-script 直接设置的变量只能在 node 环境中使用，即在 webpack 构建脚本中使用，但不能在客户端应用程序中使用，为什么？
- 只有 NODE_ENV，BASE_URL 和以 VUE_APP_ 开头的变量将通过 webpack.DefinePlugin 静态地嵌入到客户端侧的代码中。
- 认识 vue 项目最新的环境变量配置文件 .env 文件。
- 了解 vue-cli 如何解析 .env 配置文件。

## process

`process` 对象是一个全局对象，也是 `global` 对象的属性，在 node 环境下的任何地方都能访问到它，而无需引入额外模块。通过这个对象提供的属性和方法，使我们可以对当前运行的程序的 node 进程进行访问和控制。
```js
console.log(process === global.process);//true
console.log(process); // 输出一长串属性，显示进程信息，也提供一系列方法获取相关信息，如 process.cwd() 获取当前工作目录(current work directory)
```

## process.env

`process.env` 属性会返回包含用户环境相关参数的对象

> [你应该知道的 Windows 环境变量](https://zhuanlan.zhihu.com/p/67726501)
```js
console.log(process.env)
// 输出，根据个人电脑上安装的不同程序，输出变量会有不同
{
  HOME: 'C:\\Users\\xuxx29099',
  HOMEPATH: '\\Users\\xuxx29099',
  LANG: 'zh_CN.UTF-8',
  NODE_PATH: 'D:\\nvm\\node_global\\node_modules',
  USERDNSDOMAIN: 'HS.HANDSOME.COM.CN',
  USERNAME: 'xuxx29099',
  // 省略更多...
}
```
可以看出，`process.env`输出对象的惯例是大写。但在 Windows 操作系统上，环境变量不区分大小写。所以以下小写仍然可以正确输出：
```js
console.log(process.env.usename) // xuxx29099
```
> 但是便于程序跨系统运行，尽量统一使用大写。

另外，`process.env`表示的对象可以进行修改，比如增加属性和删除属性。虽然是在 node 全局对象 process 上修改，但是这些修改仅对当前进程有效，不会反映到其它进程或线程中（除非明确地要求）。

```js
// a.js
process.env.FOO = 'bar'
console.log(process.env.FOO)

// b.js
console.log(process.env.FOO)
```
```sh
node a.js # 输出 bar
node b.js # 输出 undefined
```
在 `process.env` 上为属性赋值会隐式地将值转换为字符串。
> 当值不是字符串、数字或布尔值时，Node.js 未来的版本可能会抛出错误，所以对于引用对象赋值，建议统一使用 `JSON.stringify`转为字符串。
```js
process.env.TEST = null;
console.log(typeof process.env.TEST, process.env.TEST);
// =>  string null

process.env.TEST = undefined;
console.log(typeof process.env.TEST, process.env.TEST);
// => string undefined

process.env.TEST = true;
console.log(typeof process.env.TEST, process.env.TEST);
// => string true
```
使用 `delete` 可以从 `process.env` 中删除属性。
```js
process.env.TEST = 1;
delete process.env.TEST;
console.log(process.env.TEST);
// => undefined
```
总结：
- `process.env`对象的属性惯例是大写。
- `process.env`对象属性可以进行修改，如增加和删除属性，且修改只对当前 process 进程有效。
- `process.env` 上为属性赋值会隐式地将值转换为字符串。
- `process.env` 上的属性可以使用 `delete` 删除。

## process.env.NODE_ENV

`NODE_ENV` 并不是 `process.env` 对象的原生属性。正如上面 `process.env` 所讲的，可以对其进行添加属性，所以`process.env.NODE_ENV`就是属于自定义添加的属性。

`NODE_ENV` 最早是由 `Express` 框架普及的，慢慢变成了一个约定成俗环境变量，用来指定运行 js 应用程序的环境，例如开发 development，生产 production，测试 test等环境。
> [您应该了解的NODE_ENV](https://dzone.com/articles/what-you-should-know-about-node-env)<br/>同样的，也是由 Express 普及的变量 `process.env.PORT`

## process.argv

除了在 js 文件中直接设置 `process.env` 对象属性，常见的操作是通过命令行传入参数，或者在 run-script 中传入参数，比如：
```sh
# cmd powershell git-bash
node test.js a=1 b=2 c
```
```json
// package.json
"scripts": {
  "start": "node test.js a=1 b=2 c",
},
```
这些命令行传入的参数在 js 文件内是如何被解析到的呢？

这就是利用了 node 的 process.argv 对象会返回一个数组，其中包含当 Node.js 进程被启动时传入的命令行参数。

```js
// argstest.js
process.argv.forEach((val, index) => {
  console.log(`${index}: ${val}`);
});
```
```sh
node test.js a=1 b=2 c d
```
```js
// 输出
0: D:\nodejs\node.exe
1: E:\develop\test\argstest.js
2: a=1
3: b=2
4: c
5: d
```
其中 ：
- `process.argv[0]` 表示当前 node 可执行文件(node.exe) 所在路径，通常情况下，也要以使用 `process.execPath`和`process.argv0`获取。但注意`process.argv0`稍有差异。
- `process.argv[1]` 表示正被执行的 JavaScript 文件的路径。
- 其余为传入的参数，以空格为边界输出。

`process.argv` 要特别区分`process.execArgv`：
`process.execArgv` 属性返回当 Node.js 进程被启动时，Node.js 特定的命令行选项。 这些特定的选项不会在 `process.argv` 返回的数组中出现。
同样的，`process.execArgv` 也不会包含 Node.js 的可执行脚本名称后面出现的非特定选项。
```sh
node --harmony script.js --version
```
```js
console.log(process.execArgv) // 输出 ['--harmony']
consoe.log(process.argv) // 输出 ['D:\nodejs\node.exe', 'E:\develop\test\argstest.js', '--version']
```

总结：
- node 命令行输入参数会存入 `process.argv` 数组中，且从数组第三项开始。第一项为node可执行文件路径，第二项为当前被执行文件的路径。
- node 命令行上特定命令参数和自定义命令参数区别：`process.execArgv` 和 `process.argv`。

## cross-env

`cross-env`是一个跨平台设置和使用环境变量的脚本。

### 为什么需要使用 `cross-env`

是为了抹平不同系统对环境变量操作方式的差异，主要是 window 系统平台和 POSIX 系统平台之间的差异。

> 可移植操作系统接口（英语：Portable Operating System Interface，缩写为 POSIX，最后的 X 则表明其对 Unix API 的传承。）是 IEEE 为要在各种 UNIX 操作系统上运行的软件定义 API 的一系列互相关联的标准的总称。Linux 系统基本上实现了 POSIX 标准，windows 部分实现了 POSIX 标准。

在 linux 系统下操作环境变量
> git bash 中操作同 linux 系统。

```sh
# 查看所有的环境变量
env

# 输出指定环境变量，使用 $ 表示变量名。node中常用的到的环境变量是NODE_ENV，查看是否存在
echo $NODE_ENV

# 如果不存在则添加环境变量，使用 exprot 添加的环境变量是临时的，只在当前 shell 环境下生效，关闭 shell 后将失效。如果需要永久修改需要在配置文件中修改。
export NODE_ENV=production

# 环境变量追加值
export path=$path:/home/download:/usr/local/

# 某些时候需要删除环境变量
unset NODE_ENV
```

在 window 系统的 CMD 中操作环境变量。

同样的，命令行中设置和修改的环境变量只会在当前窗口下有效，设置和修改只是临时缓存，一旦关闭命令窗口，环境变量就会失效。如果要设置真实的持久性的环境变量，可以去我的电脑->属性->更改设置->高级->环境变量，添加和设置环境变量，然后注销/重启。
```sh
# 查看所有环境变量     
set

# 查看单个环境变量     
set NODE_ENV

# 添加/更新环境变量     
set NODE_ENV=development

# 环境变量追加值 set 变量名=%变量名%;追加的变量内容 
set path=%path%;C:\web;C:\Tools 

# 删除环境变量         
set NODE_ENV=
```

在 window 10 以上系统中使用 powershell 终端上操作环境变量。
```sh
# 查看所有环境变量  
ls env:

# 搜索环境变量   
ls env:NODE*

# 查看单个环境变量 
$env:NODE_ENV

# 添加/更新环境变量 
$env:NODE_ENV=development

# 环境变量追加值
$env:path+=";c:\your_path"

# 删除环境变量        
del evn:NODE_ENV
```

正因为存在不同系统平台的差异，当我们需要使用环境变量来执行脚本文件时，可能要为不同环境准备不同的 run-script 命令。
```js
// test.js
console.log(process.env.NODE_ENV);
```
```json
// package.json
"scripts": {
    "run:windwos": "set NODE_ENV=production && node test.js",
    "run:linux": "export NODE_ENV=production && node test.js",
    // 在 linux 平台下，可以省略 export
    "run": "NODE_ENV=production node test.js",
  },
```
为了避免以上这种问题，因此 cross-env 出现了，我们就可以使用 cross-env 命令，这样我们设置或使用环境变量时就不必担心平台了。也就是说 cross-env 能够提供一个设置环境变量的脚本，使得我们就能够以unix方式设置环境变量，然后在windows上也能够兼容执行。
```json
// package.json
"scripts": {
    "run": "cross-env NODE_ENV=production node test.js",
    // 多个环境变量
    "more": "cross-env FIRST_ENV=one SECOND_ENV=two node ./my-program"
  },
```
### 源码

基本原理就是 `cross-env` 作为执行命令，`NODE_ENV=production node test.js`为执行该命令的参数，`cross-env`通过解析参数获取环境变量设置和脚本执行。

> [cross-env github](https://github.com/kentcdodds/cross-env/blob/master/src/index.js)

```js
// cross-env 的入口文件 "cross-env": "src/bin/cross-env.js"
#!/usr/bin/env node
const crossEnv = require('..')
crossEnv(process.argv.slice(2)) // process.argv.slice(2) 截取到参数：NODE_ENV=production node test.js
```
```js
// src/index.js
module.exports = crossEnv
function crossEnv(args, options = {}) { // args = ['NODE_ENV=production', 'node', 'test.js']
  // 通过 parseCommand 函数解析出预设的环境变量 执行命令 命令参数
  // parseCommand 函数将首次匹配不到 env=value 形式后的参数作为用户需要执行的命令和参数，
  // 所以需要通过 cross-env 设置的环境变量都需要在业务命令之前，之后的作为业务命令自身执行的参数
  const [envSetters, command, commandArgs] = parseCommand(args)
  const env = getEnvVars(envSetters)
  if (command) {
   // 使用设置后的 env 执行业务命令
  }
  return null
}

const envSetterRegex = /(\w+)=('(.*)'|"(.*)"|(.*))/
function parseCommand(args) {
  const envSetters = {}
  let command = null
  let commandArgs = []
  for (let i = 0; i < args.length; i++) {
    const match = envSetterRegex.exec(args[i])
    if (match) {
      let value

      if (typeof match[3] !== 'undefined') {
        value = match[3]
      } else if (typeof match[4] === 'undefined') {
        value = match[5]
      } else {
        value = match[4]
      }

      envSetters[match[1]] = value
    } else {
      // No more env setters, the rest of the line must be the command and args
      let cStart = []
      cStart = args
        .slice(i)
        // Regex:
        // match "\'" or "'"
        // or match "\" if followed by [$"\] (lookahead)
        .map(a => {
          const re = /\\\\|(\\)?'|([\\])(?=[$"\\])/g
          // Eliminate all matches except for "\'" => "'"
          return a.replace(re, m => {
            if (m === '\\\\') return '\\'
            if (m === "\\'") return "'"
            return ''
          })
        })
      command = cStart[0]
      commandArgs = cStart.slice(1)
      break
    }
  }

  return [envSetters, command, commandArgs]
}

function getEnvVars(envSetters) {
  const envVars = {...process.env}
  if (process.env.APPDATA) {
    envVars.APPDATA = process.env.APPDATA
  }
```
## .env 文件和 mode 模式

在 vue-cli 2.x 构建的项目中，会暴露 webpack 构建文件，对多环境构建的需求可以直接修改 webapck 对应的配置文件代码。常见的作法是：
- 1. 建立 config 文件夹，创建对应的环境的配置文件，如 env.dev.js
- 1. 在 run-script 中通过 cross-env 设置对应的 NODE_ENV 的值
- 2. 在对应的 webpack.config.js 文件中根据 NODE_ENV 的值获取对应的 env.[NODE_ENV].js 文件，得到设置的变量，写入 process.env 中。

> [vue-cli 2.0 vue-cli 3.0 环境变量配置](https://my.oschina.net/parchments/blog/3289586)<br />[vue-cli4.0多环境配置，变量与模式](https://www.cnblogs.com/luoxuemei/p/12124408.html)

所以在 vue-cli 2.x 构建的项目中的 package.json 的 run-script 命令中，最显著的特点是使用 `corss-env` 配置环境变量 `NODE_ENV`，而 webapck 构建是具体是构建开发包还是生产包并不严重依赖于 NODE_ENV 值，而不同配置文件中指明的webpack 自身的 mode 属性。
```json
"scripts": {
  "dev": "webpack-dev-server --inline --progress --config build/webpack.dev.conf.js",
  "start": "npm run dev",
  "build": "node build/build.js",
  "build:test": "cross-env NODE_ENV=test node build/build.js",
  "build:uat": "cross-env NODE_ENV=uat node build/build.js",
  "build:prod": "cross-env NODE_ENV=production  node build/build.js"
}
```

但在升级到 vue-cli 3.x 之后，隐藏了项目的 webpack 配置文件，提供了 vue.config.js 文件进行项目配置。对于项目配置变量的配置提供了使用 .env 文件配合 vue-cli-service 的模式 mode 的方式来进行处理。

并且这里有个很大区别，对项目内部 webpack 具体构建生产包还是开发包时严重依赖 `process.env.NODE_ENV` 变量的值，并且可选的值有 `development / production / test`。
> 当运行 vue-cli-service 命令时，所有的环境变量都从对应的环境文件中载入。如果文件内部不包含 NODE_ENV 变量，它的值将取决于模式，例如，在 production 模式下被设置为 "production"，在 test 模式下被设置为 "test"，默认则是 "development"。<br>NODE_ENV 将决定您的应用运行的模式，是开发，生产还是测试，因此也决定了创建哪种 webpack 配置。<br>例如通过将 NODE_ENV 设置为 "test"，Vue CLI 会创建一个优化过后的，并且旨在用于单元测试的 webpack 配置，它并不会处理图片以及一些对单元测试非必需的其他资源。<br>同理，NODE_ENV=development 创建一个 webpack 配置，该配置启用热更新，不会对资源进行 hash 也不会打出 vendor bundles，目的是为了在开发的时候能够快速重新构建。<br>当你运行 vue-cli-service build 命令时，无论你要部署到哪个环境，应该始终把 NODE_ENV 设置为 "production" 来获取可用于部署的应用程序。<br> [vue-cli 模式](https://cli.vuejs.org/zh/guide/mode-and-env.html#%E6%A8%A1%E5%BC%8F)

所以说，在 vue-cli 3.x 以后，如果需要构建多环境下的生产包，不能通过设置 `cross-env NODE_ENV=xxx` 来区分，而是通过建立不同的 .env 文件，然后指定不同的 --mode 值来获取。

```json
"scripts": {
  "serve": "vue-cli-service serve", // 默认 mode=development 对应 .env.development
  "serveYT": "vue-cli-service serve --mode xxx", // 对应 .env.xxx 文件，如果 .env.xxx 内部有设置 NODE_ENV 值则必须保证为 NODE_ENV=development，也可以不出现 NODE_ENV，此时会根据 serve 自动将 NODE_ENV 设为 development
  "build": "vue-cli-service build", // 默认 mode=production 对应 .env.production
  "buildYT": "vue-cli-service build --mode uat", // 对应 .env.uat 文件，如果 .env.uat 内部有设置 NODE_ENV 值则必须保证为 NODE_ENV=production，也可以不出现 NODE_ENV，此时会根据 build 自动将 NODE_ENV 设为 production
},
```

关于 vue-cli-service 加载 .env 文件的优先级顺序，可以查看[vue-cli 环境变量](https://cli.vuejs.org/zh/guide/mode-and-env.html#%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)
```sh
.env                # 在所有的环境中被载入
.env.local          # 在所有的环境中被载入，但会被 git 忽略
.env.[mode]         # 只在指定的模式中被载入
.env.[mode].local   # 只在指定的模式中被载入，但会被 git 忽略
```
示例：
```
// .env
VUE_APP_TITLE=My App

// .env.uat
NODE_ENV=production
VUE_APP_TITLE=My App (uat)
```
- `vue-cli-service build` 会加载可能存在的 .env、.env.production 和 .env.production.local 文件然后构建出生产环境应用。
- `vue-cli-service build --mode uat` 会在 uat 模式下加载可能存在的 .env、.env.uat 和 .env.uat.local 文件然后构建出生产环境应用。

这两种情况下，根据 `NODE_ENV`，构建出的应用都是生产环境应用，虽然 .env 环境未指明 NODE_ENV 的值，但是在 `vue-cli-service build` 中会根据 `build`指令默认将 `NODE_ENV=production`。在 uat 版本中，.env.uat 优于 .env 文件，所以 process.env.VUE_APP_TITLE 被覆写成了另一个值 My App (uat)。

## 自定义 vue-cli-plugin-xx 插件

简单的项目环境使用 .env 文件配合 vue-cli-service 的 mode 模式可以满足需求。但在实际开发过程中，可能需要的环境比较多，例如 dev/prod/qa/uat/poc等，如果再加上一个其它变量，如某个环境下是否启用 cas 单点登录，那对应起来就更多。这时如果直接在根目录下创建.env.XXX文件，显得整个项目的根目录下结构变大，而且.env 文件也没有条理，因此通常考虑把不同环境下的变量文件归类到js中进行配置，并且在环境切换的判断处理使用编码处理。

以下是一个实际需求：
1. 环境区分：dev/prod/qa/uat/poc
1. 本地开发时，要求 dev-server 的 proxy 代理的目标地址指向不同环境的 URL。如： dev => dev.hep.com; qa => qa.hep.com 等。
1. 无论是开发还是生产时，prod/qa/uat 都要可以开启或关闭 cas 单点登录，并且 prod 使用生产的 cas 登录网址 cas.hep.com，而 qa/uat 使用测试的 cas 登录网址 cas-test.hep.com。

### 方案一：使用 .env 文件配合 mode

需要指定以下环境配置文件：
```
// env.development
VUE_APP_TARGET_URL=dev.hep.com

// env.qa
VUE_APP_TARGET_URL=qa.hep.com
VUE_APP_OPEN_CAS= true
VUE_APP_CAS_URL=cas-test.hep.com

// env.uat
VUE_APP_TARGET_URL=uat.hep.com
VUE_APP_OPEN_CAS= true
VUE_APP_CAS_URL=cas-test.hep.com

// env.production
VUE_APP_TARGET_URL=www.hep.com
VUE_APP_OPEN_CAS= true
VUE_APP_CAS_URL=cas.hep.com
```
```json
"scripts": {
  "dev": "vue-cli-service serve",
  "dev:qa": "vue-cli-service serve --mode qa", 
  "dev:uat": "vue-cli-service serve --mode uat", 
  "build": "vue-cli-service build",
  "build:qa": "vue-cli-service build --mode qa", 
  "build:uat": "vue-cli-service build --mode uat", 
},
```

### 方案二：使用 envCong.js 文件和 vue.config.js 中处理

因为 NODE_ENV 变量被限制只能作为 vue-cli 内部判断 webpack 构建模式的依据，所以不可能通过它是判断构建环境。如果使用 .env 文件另外定义一个变量，也同上面一样会出现很多 .env 文件。反而比方案一更烦琐。

### 方案三：自定义 vue-cli-plugin 插件处理

要处理多环境问题，至始至终都要从 run-script 的命令行中传入环境变量。而 vue-cli 3.x 以上可以通过自定义 vue-cli-plugin 插件在 vue-cli-service 服务启动之前处理逻辑。

针对上述问题，可以拆成两个需求：开发时的本地服务的代理 和 cas 单点登录问题。为了解耦，分成两个插件处理。

> [vue-cli 插件开发指南](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html#%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97)

vue-cli-plugin-xx 插件很简单，就是一个 js 文件导致一个函数，函数接受两个入参 api 和 options。
```js
// vue-cli-plugin-xx
module.exports = (api, options) => {
  // 插件代码
}
```
然后在 package.json 增加 vuePlugins 属性，注册 vue-cli 插件
```json
// package.json
"vuePlugins": {
  "service": [
    "./build/vue-cli-plugin-setcas.js",
    "./build/vue-cli-plugin-setenv.js"
  ]
}
```
关于插件入参 options 就是 vue-config.js 中配置内容，也就是说可以插件内修改或增加 vue-config.js 的配置内容。具体对象属性：
> [cli-service/lib/options.js](https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-service/lib/options.js)
```js
{
  "publicPath": "/",
  "outputDir": "dist",
  "assetsDir": "",
  "indexPath": "index.html",
  "filenameHashing": true,
  "runtimeCompiler": false,
  "transpileDependencies": [],
  "productionSourceMap": true,
  "parallel": true,
  "integrity": false,
  "css": {},
  "lintOnSave": "default",
  "devServer": {}
}
```
 入参 api 是一个对象，包含对象属性的属性和原型属性，实例对象默认属性大致如下： 
```js
// api 是一个对象，包含 id 和 service 对象，主要关注的是 service 对象提供的可操作属性，也就是 vue-cli-service 服务相关的接口
// 以下是vue-cli 构建项目默认的 service 对象，如果使用 api.registerCommand 注册了自定义命令，那 commands 会出现自定义命令相关参数。
{
  "id": "local:./setenv.js",
  "service": {
    "initialized": true,
    "context": "E:\\develop\\vue3-demo",
    "webpackChainFns": [null, null, null, null, null, null, null],
    "webpackRawConfigFns": [],
    "devServerConfigFns": [],
    "commands": {
      "serve": {
        "opts": {
          "description": "start development server",
          "usage": "vue-cli-service serve [options] [entry]",
          "options": {
            "--open": "open browser on server start",
            "--copy": "copy url to clipboard on server start",
            "--stdin": "close when stdin ends",
            "--mode": "specify env mode (default: development)",
            "--host": "specify host (default: 0.0.0.0)",
            "--port": "specify port (default: 8080)",
            "--https": "use https (default: false)",
            "--public": "specify the public network URL for the HMR client",
            "--skip-plugins": "comma-separated list of plugin names to skip for this run"
          }
        }
      },
      "build": {
        "opts": {
          "description": "build for production",
          "usage": "vue-cli-service build [options] [entry|pattern]",
          "options": {
            "--mode": "specify env mode (default: production)",
            "--dest": "specify output directory (default: dist)",
            "--modern": "build app targeting modern browsers with auto fallback",
            "--no-unsafe-inline": "build app without introducing inline scripts",
            "--target": "app | lib | wc | wc-async (default: app)",
            "--inline-vue": "include the Vue module in the final bundle of library or web component target",
            "--formats": "list of output formats for library builds (default: commonjs,umd,umd-min)",
            "--name": "name for lib or web-component mode (default: \"name\" in package.json or entry filename)",
            "--filename": "file name for output, only usable for 'lib' target (default: value of --name)",
            "--no-clean": "do not remove the dist directory before building the project",
            "--report": "generate report.html to help analyze bundle content",
            "--report-json": "generate report.json to help analyze bundle content",
            "--skip-plugins": "comma-separated list of plugin names to skip for this run",
            "--watch": "watch for changes",
            "--stdin": "close when stdin ends"
          }
        }
      },
      "inspect": {
        "opts": {
          "description": "inspect internal webpack config",
          "usage": "vue-cli-service inspect [options] [...paths]",
          "options": {
            "--mode": "specify env mode (default: development)",
            "--rule <ruleName>": "inspect a specific module rule",
            "--plugin <pluginName>": "inspect a specific plugin",
            "--rules": "list all module rule names",
            "--plugins": "list all plugin names",
            "--verbose": "show full function definitions in output",
            "--skip-plugins": "comma-separated list of plugin names to skip for this run"
          }
        }
      },
      "help": { "opts": {} },
      "lint": {
        "opts": {
          "description": "lint and fix source files",
          "usage": "vue-cli-service lint [options] [...files]",
          "options": {
            "--format [formatter]": "specify formatter (default: codeframe)",
            "--no-fix": "do not fix errors or warnings",
            "--no-fix-warnings": "fix errors, but do not fix warnings",
            "--max-errors [limit]": "specify number of errors to make build failed (default: 0)",
            "--max-warnings [limit]": "specify number of warnings to make build failed (default: Infinity)"
          },
          "details": "For more options, see https://eslint.org/docs/user-guide/command-line-interface#options"
        }
      }
    },
    "pkgContext": "E:\\develop\\vue3-demo",
    "pkg": {
      "name": "vue3-demo",
      "version": "0.1.0",
      "private": true,
      "scripts": {
        "start": "vue-cli-service serve",
        "build": "vue-cli-service build",
        "lint": "vue-cli-service lint"
      },
      "dependencies": { "core-js": "^3.6.5", "vue": "^3.0.0-beta.1" },
      "devDependencies": {
        "@vue/babel-plugin-jsx": "^1.0.0-rc.3",
        "@vue/cli-plugin-babel": "~4.4.0",
        "@vue/cli-plugin-eslint": "~4.4.0",
        "@vue/cli-service": "~4.4.0",
        "@vue/compiler-sfc": "^3.0.0-beta.1",
        "babel-eslint": "^10.1.0",
        "eslint": "^6.7.2",
        "eslint-plugin-vue": "^7.0.0-alpha.0",
        "vue-cli-plugin-vue-next": "~0.1.3"
      },
      "eslintConfig": {
        "root": true,
        "env": { "node": true },
        "extends": ["plugin:vue/vue3-essential", "eslint:recommended"],
        "parserOptions": { "parser": "babel-eslint" },
        "rules": {}
      },
      "browserslist": ["> 1%", "last 2 versions", "not dead"],
      "vuePlugins": { "service": ["./setenv.js"] },
      "readme": "ERROR: No README data found!",
      "_id": "vue3-demo@0.1.0"
    },
    "plugins": [
      { "id": "built-in:commands/serve" },
      { "id": "built-in:commands/build" },
      { "id": "built-in:commands/inspect" },
      { "id": "built-in:commands/help" },
      { "id": "built-in:config/base" },
      { "id": "built-in:config/css" },
      { "id": "built-in:config/prod" },
      { "id": "built-in:config/app" },
      { "id": "@vue/cli-plugin-babel" },
      { "id": "@vue/cli-plugin-eslint" },
      { "id": "vue-cli-plugin-vue-next" },
      { "id": "local:./setenv.js" }
    ],
    "pluginsToSkip": {},
    "modes": {
      "serve": "development",
      "build": "production",
      "inspect": "development"
    },
    "mode": "development",
    "projectOptions": {
      "publicPath": "/",
      "outputDir": "dist",
      "assetsDir": "",
      "indexPath": "index.html",
      "filenameHashing": true,
      "runtimeCompiler": false,
      "transpileDependencies": [],
      "productionSourceMap": true,
      "parallel": true,
      "integrity": false,
      "css": {},
      "lintOnSave": "default",
      "devServer": {}
    }
  }
}
```
查看 vue-cli 源码，api 是 PluginAPI 的实例，所以原型属性可以查看：
> [PluginAPI](https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-service/lib/PluginAPI.js)

```js
class PluginAPI {
  /**
   * @param {string} id - Id of the plugin.
   * @param {Service} service - A vue-cli-service instance.
   */
  constructor (id, service) {
    this.id = id
    this.service = service
  }

  get version () {
    return require('../package.json').version
  }

  /**
   * Current working directory.
   */
  getCwd () {
    return this.service.context
  }

  /**
   * Resolve path for a project.
   *
   * @param {string} _path - Relative path from project root
   * @return {string} The resolved absolute path.
   */
  resolve (_path) {
    return path.resolve(this.service.context, _path)
  }

  /**
   * Check if the project has a given plugin.
   *
   * @param {string} id - Plugin id, can omit the (@vue/|vue-|@scope/vue)-cli-plugin- prefix
   * @return {boolean}
   */
  hasPlugin (id) {
    return this.service.plugins.some(p => matchesPluginId(id, p.id))
  }

  /**
   * Register a command that will become available as `vue-cli-service [name]`.
   *
   * @param {string} name
   * @param {object} [opts]
   *   {
   *     description: string,
   *     usage: string,
   *     options: { [string]: string }
   *   }
   * @param {function} fn
   *   (args: { [string]: string }, rawArgs: string[]) => ?Promise
   */
  registerCommand (name, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = null
    }
    this.service.commands[name] = { fn, opts: opts || {}}
  }

  /**
   * Register a function that will receive a chainable webpack config
   * the function is lazy and won't be called until `resolveWebpackConfig` is
   * called
   *
   * @param {function} fn
   */
  chainWebpack (fn) {
    this.service.webpackChainFns.push(fn)
  }

  /**
   * Register
   * - a webpack configuration object that will be merged into the config
   * OR
   * - a function that will receive the raw webpack config.
   *   the function can either mutate the config directly or return an object
   *   that will be merged into the config.
   *
   * @param {object | function} fn
   */
  configureWebpack (fn) {
    this.service.webpackRawConfigFns.push(fn)
  }

  /**
   * Register a dev serve config function. It will receive the express `app`
   * instance of the dev server.
   *
   * @param {function} fn
   */
  configureDevServer (fn) {
    this.service.devServerConfigFns.push(fn)
  }

  /**
   * Resolve the final raw webpack config, that will be passed to webpack.
   *
   * @param {ChainableWebpackConfig} [chainableConfig]
   * @return {object} Raw webpack config.
   */
  resolveWebpackConfig (chainableConfig) {
    return this.service.resolveWebpackConfig(chainableConfig)
  }

  /**
   * Resolve an intermediate chainable webpack config instance, which can be
   * further tweaked before generating the final raw webpack config.
   * You can call this multiple times to generate different branches of the
   * base webpack config.
   * See https://github.com/mozilla-neutrino/webpack-chain
   *
   * @return {ChainableWebpackConfig}
   */
  resolveChainableWebpackConfig () {
    return this.service.resolveChainableWebpackConfig()
  }

  /**
   * Generate a cache identifier from a number of variables
   */
  genCacheConfig (id, partialIdentifier, configFiles = []) {
    // 省略代码
  }
}
```

所以实现我们的需求，主要是修改已经存在的 cli-service 命令。
> [修改已经存在的 cli-service 命令](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html#%E4%BF%AE%E6%94%B9%E5%B7%B2%E7%BB%8F%E5%AD%98%E5%9C%A8%E7%9A%84-cli-service-%E5%91%BD%E4%BB%A4)

```js
// vue-cli-plugin-setenv.js'
const devServerProxyFn = require('./devServerProxy')
// 可以称到单独文件引入
// module.exports = (targetURL) => {
//   return {
//     // 需求管控接口
//     '/pm/hep-pm-server/': {
//       target: targetURL,
//       ws: true,
//       changeOrigin: true,
//     },
//     // 效能平台CI/CD
//     '/hepcore': {
//       target: targetURL,
//       ws: true,
//       changeOrigin: true,
//     },
//   }
// }
const { PROXY_TARGET_MAPPER } = require('./envConfig')
// 可以称到环境配置文件中 envConfig
// const PROXY_TARGET_MAPPER = {
//   vm: 'http://test.hep.qinglight.com',
//   docker: 'http://test.c-mdl5s.hep.dev.xxx.com',
//   qa: 'http://qa.c-mdl5s.hep.dev.xxx.com',
//   prod: 'http://dev.xxx.com',
// }

function isEmptyObject(obj) {
  return Reflect.ownKeys(obj).length === 0
}

function setenv(env, args, options) {
  let { target, VUE_APP } = args[0]

  /**
   * 开发环境下，使用 vue-cli-service serve 构建时，根据传入参数 target 判断 devServer 代理的目标地址 targetURL
   * 坑：因为 target 只在 srver 时传入，但是没有写入 process.env 对象中，所以不管是生产环境还是开发环境，业务代码中都不要再依赖环境变量：process.env.VUE_APP_TARGRT_URL
   * --target=vm 虚拟机(默认) docder 容器 qa
   */
  if (env === 'serve') {
    if (!target) target = 'vm'
    const targetURL = PROXY_TARGET_MAPPER[target]
    console.log('targetURL', targetURL)
    const devServerProxy = devServerProxyFn(targetURL)

    /**
     * 如果 options.devServer.proxy = {} 是空对象会报错
     * 所以 Object.assign 处理后的 proxy 必须是有属性的对象，即只要保证 deveServerProxy 是一个非空的对象即可。
     */
    if (!isEmptyObject(devServerProxy)) {
      options.devServer.proxy ? null : (options.devServer.proxy = {})
      Object.assign(options.devServer.proxy, devServerProxy)
    }
  }

  /**
   * 提供一种方式，不需要定义 .env 环境就可以自定义环境变量在业务逻辑中使用，只限布尔值，有传入则为 true，未传入 false。
   * 并且做如下约定：
   * 1. 在构建命令中传入变量
   *    1.1 传入一个：vue-cli-service build --VUE_APP=IS_QIANKUN"
   *    1.2 传入多个：vue-cli-service build --VUE_APP=IS_QIANKUN --VUE_APP=IS_ANALYZ"
   * 2. 业务代码中实现变量，都有 VUE_APP 前缀，即：
   *    process.env.VUE_APP_IS_QIANKUN
   *    process.env.VUE_APP_IS_ANALYZ
   */
  if (Array.isArray(VUE_APP)) {
    for (let key of VUE_APP) {
      process.env[`VUE_APP_${key}`] = true
    }
  } else if (VUE_APP) {
    process.env[`VUE_APP_${VUE_APP}`] = true
  }
}

module.exports = (api, options) => {
  const commands = api.service.commands
  const envKeys = Object.keys(commands)
  for (let env of envKeys) {
    const { fn } = commands[env]
    commands[env].fn = ((env) => (...args) => {
      setenv(env, args, options)
      return fn(...args)
    })(env)
  }
}
```
```js
// vue-cli-plugin-setcas.js
const fs = require('fs')

/**
 * 坑：保证未尾添加 / 因为在 request.js 和 nginx.conf 中有用到
 */
const CAS_URL_MAPPER = {
  test: 'https://test-cas.hundsun.com/',
  hs: 'https://hs-cas.hundsun.com/',
  poc: 'http://cas.devops.hs.net/',
}

function setCas(env, args) {
  /**
   * 生产环境下，主应用 Frame 使用 vue-cli-service build 构建时，需要根据传入的 cas 的值更改 nginx.conf 配置参数 __casHost__
   * 并且要配合在流水线node构建主应用 Frame 时增加命令：cp  nginx.conf dist/
   * 同步在根目录下的 dockerfile 文件更改命令：COPY /home/cicd-web/frame/nginx.conf /etc/nginx/nginx.conf
   *
   * 不管开发还是生产环境，判断是否需要开启 cas 登录，并且根据它的值判断使用 test-cas 还是 hs-cas 还是 ip
   * --cas=test / hs / poc
   */
  let { cas } = args[0]

  if (cas) {
    process.env.VUE_APP_USE_CAS_LOGIN = true
    process.env.VUE_APP_CAS_URL = CAS_URL_MAPPER[cas]
  } else {
    process.env.VUE_APP_USE_CAS_LOGIN = false
  }

  if (env === 'build' && cas) {
    console.log('env build cas', process.env.VUE_APP_USE_CAS_LOGIN, process.env.VUE_APP_CAS_URL)
    fs.readFile('./nginx.conf', 'utf-8', function(err, data) {
      if (err) throw err

      data = data.replace(/__casHost__/gi, process.env.VUE_APP_CAS_URL || CAS_URL_MAPPER.hs)
      fs.writeFile('./nginx.conf', data, function(err) {
        if (err) {
          throw err
        }
        console.log('nginx.conf文件中变量：__casHost__写入成功')
      })
    })
  }
}

module.exports = (api) => {
  const { build } = api.service.commands
  const fn = build.fn
  build.fn = (...args) => {
    setCas('build', args)
    return fn(...args)
  }
}
```
在 package.json 中的 run-script 更改为：
```json
"scripts": {
    "serve": "vue-cli-service serve --target=vm",
    "start": "npm run serve",
    "dev": "npm run serve",
    "dev:docker": "vue-cli-service serve --target=docker --cas=test",
    "dev:qa": "vue-cli-service serve --target=qa --cas=test",
    "dev:prod": "vue-cli-service serve --target=prod --cas=hs",
    "build": "vue-cli-service build",
    "build:cas-hs": "vue-cli-service build --cas=hs",
    "build:cas-test": "vue-cli-service build --cas=test",
    "build:cas-poc": "vue-cli-service build --cas=poc",
    "build:sftp": "npm run build && gulp",
    "sftp": "gulp",
  },
```

## vue-cli 中设置环境变量如何同步可以在 node 环境中和客户端 .vue 文件中使用

如果环境变量需要在客户端文件同步使用，需要使用 `webpack.DefinePlugin` 定义。但在 @vue/cli@3.x 的工程项目中，在 .env 文件中定义以 `VUE_APP_XX`开头的变量，脚手架内部会自动使用 `DefinePlugin` 插件定义为node 端和浏览器端文件都可使用。
> 只有 NODE_ENV，BASE_URL 和以 VUE_APP_ 开头的变量将通过 webpack.DefinePlugin 静态地嵌入到客户端侧的代码中

看下源码中对这些变量的处理：

1. 环境变量定义到 node 端的 `process.env` 对象上
```js
// @vue/cli-server/lib/Server.js 中 init 函数
/**
   * service.init 主要有三个功能：
   * 1. loadEnv 加载对应模式下本地的环境变量文件
   * 2. loadUserOptions 解析 vue.config.js 或者 package.vue
   * 3. apply 执行所有被加载的插件，这里就是该命令下动态生成 webpack 配置 config 并执行
   */
  init (mode = process.env.VUE_CLI_MODE) {
    if (this.initialized) {
      return
    }
    this.initialized = true
    this.mode = mode

    // load mode .env
    if (mode) {
      this.loadEnv(mode)
    }
    // load base .env
    this.loadEnv()

    // 省略代码
  }

/**
 * 加载本地的环境文件，环境文件的作用就是设置某个模式下特有的变量
 * 加载环境变量其实要注意的就是优先级的问题，下面的代码中 load 函数调用顺序已经体现了：
 * 先加载 .env.mode.local，然后加载 .env.mode 最后再加载 .env
 * 由于 dotenv-expand.js 库中源码：(https://github.com/motdotla/dotenv-expand/blob/master/lib/main.js)
 * value = environment.hasOwnProperty(key) ? environment[key] : (config.parsed[key] || '')
 * 所以环境变量值不会被覆盖，即 .env.mode.local 的优先级最高，.env.mode 次之，.env 优先级最低
 * 另外，注意一点：.env 环境文件中的变量不会覆盖命令行中执行时设置的环境变量，比如 corss-env NODE_ENV=development vue-cli-service serve
 * 
 * 总之一句话，更早设置的环境变量不会被后面设置的覆盖。
 * 
 * .env.mode.local 与 .env.mode 的区别就是前者会被 git 追踪文件时忽略掉。
 * 
 * 关于环境变量 [node-expand_使用dotenv-expand掌握Node.js上的环境变量](https://blog.csdn.net/weixin_26737625/article/details/108648901)
 */
  loadEnv (mode) {
    const logger = debug('vue:env')
    // path/.env.production || path/.env.development || ...
    const basePath = path.resolve(this.context, `.env${mode ? `.${mode}` : ``}`)
    // path/.env.local.production
    const localPath = `${basePath}.local`

    const load = envPath => {
      try {
        const env = dotenv.config({ path: envPath, debug: process.env.DEBUG })

        /**
         * dotenv-expand.js 源码比较短的 46行：(https://github.com/motdotla/dotenv-expand/blob/master/lib/main.js)
         * 有一句核心代码：
         * var environment = config.ignoreProcessEnv ? {} : process.env
         * value = environment.hasOwnProperty(key) ? environment[key] : (config.parsed[key] || '')
         * for (var processKey in config.parsed) {
         *   environment[processKey] = config.parsed[processKey]
         * }
         * 即已存在 process.env[key]=value 优先级更高，不会被覆盖
         * 所以先加载 .env.development 再加载 .env
         * 即 .env.development 变量优先级高于 .env
         */
        dotenvExpand(env) // 会把 .env 设置的变量挂载到 process.env 对象上
        logger(envPath, env)
      } catch (err) {
        // only ignore error if file is not found
        if (err.toString().indexOf('ENOENT') < 0) {
          error(err)
        }
      }
    }

    load(localPath)
    load(basePath)

    // 省略代码
  }
```

2. 环境变量通过 DefinePlugin 注入客户端

```js
// @vue/cli-service/lib/util/resolveClientEnv.js
const prefixRE = /^VUE_APP_/

// 所以只有以 VUE_APP_ 开头的才会被注入到 DefinePlugin 中

module.exports = function resolveClientEnv (options, raw) {
  const env = {}
  Object.keys(process.env).forEach(key => {
    if (prefixRE.test(key) || key === 'NODE_ENV') {
      env[key] = process.env[key]
    }
  })
  env.BASE_URL = options.publicPath

  if (raw) {
    return env
  }

  for (const key in env) {
    env[key] = JSON.stringify(env[key])
  }
  return {
    'process.env': env
  }
}

// 这个函数在两个地方使用，即生成 webpack 的配置文件中 config：base.js / app.js

// @vue/cli-serverlib/config/base.js
const resolveClientEnv = require('../util/resolveClientEnv')
webpackConfig
  .plugin('define')
    .use(webpack.DefinePlugin, [
      resolveClientEnv(options)
    ])

// @vue/cli-serverlib/config/app.js
// HTML plugin
const resolveClientEnv = require('../util/resolveClientEnv')

const htmlOptions = {
  title: api.service.pkg.name,
  templateParameters: (compilation, assets, assetTags, pluginOptions) => {
    // enhance html-webpack-plugin's built in template params
    let stats
    return Object.assign({
      // make stats lazy as it is expensive
      // TODO: not sure if it's still needed as of <https://github.com/jantimon/html-webpack-plugin/issues/780#issuecomment-390651831>
      get webpack () {
        return stats || (stats = compilation.getStats().toJson())
      },
      compilation: compilation,
      webpackConfig: compilation.options,
      htmlWebpackPlugin: {
        files: assets,
        options: pluginOptions
      }
    }, resolveClientEnv(options, true /* raw */))
  }
}

 webpackConfig
  .plugin('html')
    .use(HTMLPlugin, [htmlOptions])
```

- 具体参考[Node 环境变量 process.env.NODE_ENV 之webpack应用](https://blog.csdn.net/icewfz/article/details/76640319)
- vue-cli-service 为什么只能使用 VUE_APP 开头的变量[vue-cli 3 环境变量和模式配置实践与源码分析](https://segmentfault.com/a/1190000016194157)
- .env 文件解析脚本 [dotenv](https://github.com/motdotla/dotenv/blob/master/lib/main.js)