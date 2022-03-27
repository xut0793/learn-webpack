const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../bundle-analysis'),
  entry: './index.js',
  output: {
    // path: path.resolve(__dirname),
    // filename: 'bundle-commonjs.js',
    // filename: 'bundle-esm.js',
    
    // async load
    // path: path.resolve(__dirname, 'bundle-async'),
    path: path.resolve(__dirname, 'bundle-preload'),
    filename: 'bundle.js',
    chunkFilename: '[name].js',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin()
  ]
}