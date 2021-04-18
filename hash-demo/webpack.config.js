const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../hash-demo'),
  entry: './index.js',
  output: {
    // path: path.resolve(__dirname, 'bundle-hash'),
    // filename: '[name]~[hash:8].js',
    // chunkFilename: '[name]~[hash:8].js',

    // path: path.resolve(__dirname, 'bundle-contenthash'),
    // filename: '[name]~[chunkhash:8].js',
    // chunkFilename: '[name]~[chunkhash:8].js',

    // path: path.resolve(__dirname, 'bundle-runtime'),
    // filename: '[name]~[chunkhash:8].js',
    // chunkFilename: '[name]~[chunkhash:8].js',

    path: path.resolve(__dirname, 'bundle-chunkId'),
    filename: '[name]~[chunkhash:8].js',
    chunkFilename: '[name]~[chunkhash:8].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      // filename: '[name]~[hash:8].css',
      filename: '[name]~[contenthash:8].css',
    }),
  ],
  optimization: {
    runtimeChunk: {
      name: 'runtime',
    },
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  }
}