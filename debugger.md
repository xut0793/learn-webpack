# webpack 源码调试

[调试webpack](https://www.cnblogs.com/yfrs/p/webpackdebug.html)

## 方法1：使用 vscode 运行 npm 调试

此方法需要手动首次设置断点，不然就直接运行完毕了。

```json5
{
  "version": "0.2.0",
  "configurations": [
    {
      // 需要提前设置断点，stopOnEntry 对此无效
      "name": "webpack debugger by npm",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": [
        "run-script",
        "debug"
      ],
      "skipFiles": [
        "<node_internals>/**"
      ]
    },
  ]
}
```

## 方法2： 使用 vscode 运行 node 调试

较为推荐这种方法：

```json5
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "webpack bin",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/webpack/bin/webpack.js",
      "args": ["--config=./dev-demo/webpack.config.js"],
      "stopOnEntry": true,
      "skipFiles": [
        "<node_internals>/**"
      ],
    },
  ]
}
```

## 方法3： 命令行结合 Chrome DevTools 调试

1. 在项目根目录下，运行此命令：`node --inspect-brk ./node_modules/webpack/bin/webpack.js`
1. 使用 `Chrome` 浏览器，输入 `chrome://inspect`
1. 单击 Remote Target 下的 inspect，选择 Sources，查找对应调试文件