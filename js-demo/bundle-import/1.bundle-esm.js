(self["webpackChunk"] = self["webpackChunk"] || []).push([[1],[
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "genRandomNumber": () => (/* binding */ genRandomNumber)
/* harmony export */ });
/**
 * 生成指定位数的随机整数
 */
const genRandomNumber = (n = 1) => {
  return Math.round(Math.random() * Math.pow(10, n))
}


/***/ })
]]);