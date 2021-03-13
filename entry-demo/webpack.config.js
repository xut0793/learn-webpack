const path = require('path')
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
//     utils: {
//       import: './utils.js',
//       dependOn: 'index',
//     },
//     index: './index.js',
//   },
//   output: {
//     path: path.resolve(__dirname, 'bundle-depend'),
//     filename: '[name].bundle.js',
//   },
// }

module.exports = {
  mode: 'none',
  context: path.resolve(__dirname, '../entry-demo'),
  entry: {
    index: {
      import: './index.js',
      filename: '[name][ext]',
    },
    greet: {
      import: './greet.js',
      filename: '[name][ext]',
    }
  },
  output: {
    path: path.resolve(__dirname, 'bundle-entry-descriptor'),
  }
}