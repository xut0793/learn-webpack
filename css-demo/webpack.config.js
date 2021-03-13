const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const PurgecssPlugin = require('purgecss-webpack-plugin')
const glob = require('glob-all')
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../css-demo'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'bundle-purge'),
    filename: 'js/[name].js',
    assetModuleFilename: 'images/[name][ext]',
    chunkFilename: 'js/[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          // MiniCssExtractPlugin.loader,
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../'
            },
          },
          'css-loader'
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      chunkFilename: 'css/[name].css',
    }),
    new PurgecssPlugin({
      paths: glob.sync(path.resolve(__dirname, '../css-demo/*.js'),  { nodir: true }),
    }),
  ],
  optimization: {
    // minimize: true,
    // minimizer: [
    //   // 在 webpack@5 中，你可以使用 `...` 语法来保留默认的 js 压缩选项。
    //   // 如果是 webpack@4 中，需要手动补充默认的 js 压缩插件，即 `new TerserWebpackPlugin()`
    //   '...',
    //   new CssMinimizerPlugin(),
    // ],
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'css-purged', // 默认会以 key 加splitChunks.atuomaticNameDelimiter 连接所依赖的模块拼接而成,如 vendors~a~b~c.js
          filename: 'css/[name].css', // 这里的变量占位符 name 就会是上面自定义的 name: style-split-merge，所以最终的输出文件名是 css/style-split-merge.css
          type: 'css/mini-extract',
          // For webpack@4
          // test: /\.css$/,
          chunks: 'all',
          enforce: true, // 强制合并，告诉 webpack 忽略默认的 `splitChunks.minSize`、`splitChunks.minChunks`、`splitChunks.maxAsyncRequests` 和 `splitChunks.maxInitialRequests` 选项，并始终为此缓存组创建 chunk。
        },
      },
    },
  },
};
