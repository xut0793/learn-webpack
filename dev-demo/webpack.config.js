const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  mode: 'development',
  context: path.resolve(__dirname, '../dev-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-dev-server'),
    filename: 'bundle.js',
  },
  // watch: true,
  // watchOptions: {
  //   aggregateTimeout: 2000,
  //   ignored: '**/utils/**/*.js',
  // }
  devtool: false,
  devServer: {
    open: true,
    hot: true,
    contentBase: path.resolve(__dirname, '../dev-demo'),
  },
  plugins: [new HtmlWebpackPlugin()],
}
