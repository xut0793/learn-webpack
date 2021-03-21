const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../entry-demo'),
//   // entry: './index.js',
//   entry: ['./greet.js', './index.js'],
//    output: {
//     // filename: 'bundle-utils.js',
//     filename: 'bundle-greet.js',
//     // filename: 'bundle-utils-esm.js',
//     path: path.resolve(__dirname),
//   }
// }
// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../entry-demo'),
//   entry: {
//     index: './index.js',
//     greet: './greet.js',
//   },
//   output: {
//     path: path.resolve(__dirname, 'bundle-object'),
//     filename: '[name].bundle.js'
//   }
// }

// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../entry-demo'),
//   entry: {
//     index: {
//       import: './index.js',
//       dependOn: 'utils',
//     },
//     utils: './utils.js',
//   },
//   output: {
//     path: path.resolve(__dirname, 'bundle-depend'),
//     filename: '[name].bundle.js',
//     clean: true,
//   },
// }

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: {
    index: {
      import: './index.js',
      filename: '[name].js',
    },
  },
  output: {
    path: path.resolve(__dirname, 'bundle-entry-filename'),
    clean: true,
  }
}

// module.exports = {
//   mode: 'none',
//   context: path.resolve(__dirname, '../entry-demo'),
//   // entry: {
//   //   module_1: './module-1.js',
//   //   module_2: './module-2.js',
//   // },
//   entry: {
//     module_1: {
//       import: './module-1.js',
//       dependOn: 'shared',
//     },
//     module_2: {
//       import: './module-2.js',
//       dependOn: 'shared',
//     },
//     shared: './module-depend.js',
//   },
//   output: {
//     path: path.resolve(__dirname, 'split-code-entry-depend-runtime-single'),
//     filename: '[name].bundle.js',
//   },
//   plugins: [
//     new HtmlWebpackPlugin()
//   ],
//   optimization: {
//     runtimeChunk: 'single',
//   }
// }