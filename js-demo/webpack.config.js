// const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../js-demo'),
//   entry: './entry-external.js',
//   output: {
//     path: path.resolve(__dirname, 'bundle-external'),
//     filename: 'bundle-commonjs2.js',
//     library: 'entryExternal',
//     libraryTarget: 'commonjs2'
//   },
//   externals: {
//     lodash: 'commonjs2 lodash'
//   }
// }

/**
 * dce.js
 */
// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../js-demo'),
//   entry: './dce.js',
//   output: {
//     path: path.resolve(__dirname, 'bundle-dce'),
//     filename: 'bundle-dce.js',
//   },
//   optimization: {
//     minimize: true,
//   }
// }

/**
 * dce-module.js
 */
//  module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../js-demo'),
//   // entry: './dce-module.js',
//   entry: './entry-class.js',
//   output: {
//     path: path.resolve(__dirname, 'bundle-class'),
//     filename: 'bundle.js',
//   },
//   optimization: {
//     minimize: true,
//     usedExports: true,
//   }
// }

/**
 * tree shaking
 * side effect
 */
// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../js-demo'),
//   entry: './entry-side-effect.js',
//   output: {
//     path: path.resolve(__dirname, 'bundle-side-effect'),
//     filename: 'bundle-tree-shaking.js',
//   },
//   module: {
//     rules: [
//       {
//         test: /\.css$/i,
//         use: [
//           'style-loader',
//           'css-loader'
//         ],
//         sideEffects: true,
//       },
//     ]
//   },
//   optimization: {
//     minimize: true,
//     usedExports: true,
//     sideEffects: true,
//   }
// }

/**
 * scope hositing
 */
module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../js-demo'),
  entry: './entry-scope-hositing.js',
  output: {
    path: path.resolve(__dirname, 'bundle-scope-hositing'),
    filename: 'bundle-scope-hositing.js',
  },
  optimization: {
    concatenateModules: true,
  }
}