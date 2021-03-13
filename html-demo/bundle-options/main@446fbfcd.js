/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, exports) => {

/**
 * 生成指定位数的随机整数
 */
exports.genRandomNumber = function(n) {
  return Math.round(Math.random() * Math.pow(10, n))
}

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const { genRandomNumber } = __webpack_require__(1)

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'

  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())
})();

/******/ })()
;