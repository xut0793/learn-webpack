const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../html-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-options'),
    filename: '[name]@[hash:8].js',
    clean: true,
  },
  plugins: [
    // new HtmlWebpackPlugin({
    //   template: './index-template.ejs',
    //   templateParameters: {
    //     custom: 'custom_value',
    //   }
    // })
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
  ]
}