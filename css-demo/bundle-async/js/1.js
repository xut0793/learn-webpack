(self["webpackChunk"] = self["webpackChunk"] || []).push([[1],[
/* 0 */,
/* 1 */,
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "greet": () => (/* binding */ greet)
/* harmony export */ });
/* harmony import */ var _async_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);

function greet(name, targetEle) {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = `How are you ? ${name}`
  eleDiv.classList.add('greet')
  targetEle.appendChild(eleDiv)
}


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ })
]]);