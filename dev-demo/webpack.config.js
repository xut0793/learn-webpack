const path = require('path')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../dev-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-watch'),
    filename: 'bundle.js',
  },
  watch: true,
  watchOptions: {
    aggregateTimeout: 2000,
    ignored: '**/utils/**/*.js',
  }
}