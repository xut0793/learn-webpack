/**
 * 版本：
 * "webpack": "^5.24.2",
 * "webpack-cli": "^4.5.0"
 * 
 * math.js 依赖模块
 * exports.cube = function cube(x) {
 *   return x * x * x;
 * }
 * 
 * index.js 入口
 * const { cube } = require('./math.js')
 * console.log(`cube(5) = ${cube(5)}`)
 * 
 * webpack.config.js 配置
 * module.exports = {
 *   mode: 'none',
 *   entry: './index.js',
 *   output: {
 *     path: path.resolve(__dirname),
 *     filename: 'bundle-commonjs.js',
 *   }
 * }
 */

(() => { // webpackBootstrap
	var __webpack_modules__ = ([
    /* 0 */,
    /* 1 */
    ((__unused_webpack_module, exports) => {
    // CommonJS
    exports.cube = function cube(x) {
      return x * x * x;
    }
    })
	]);

  /************************************************************************/
	// The module cache
	var __webpack_module_cache__ = {};
	
	// The require function
	function __webpack_require__(moduleId) {
		// Check if module is in cache
		if(__webpack_module_cache__[moduleId]) {
			return __webpack_module_cache__[moduleId].exports;
		}
		// Create a new module (and put it into the cache)
		var module = __webpack_module_cache__[moduleId] = {
			// no module.id needed
			// no module.loaded needed
			exports: {}
		};
	
		// Execute the module function
		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
	
		// Return the exports of the module
		return module.exports;
	}
  /************************************************************************/

  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
  (() => {
  // CommonJS
  const { cube } = __webpack_require__(1)
  console.log(`cube(5) = ${cube(5)}`)
  })();
  
})();