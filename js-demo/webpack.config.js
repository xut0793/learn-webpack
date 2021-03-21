// const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-external.js',
  output: {
    path: path.resolve(__dirname, 'bundle-external'),
    filename: 'bundle-commonjs2.js',
    library: 'entryExternal',
    libraryTarget: 'commonjs2'
  },
  externals: {
    lodash: 'commonjs2 lodash'
  }
}