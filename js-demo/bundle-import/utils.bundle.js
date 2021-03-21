(self["webpackChunk"] = self["webpackChunk"] || []).push([[1],[
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * 生成指定位数的随机整数
 */

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (genRandomNumber = (n = 1) => { // import().then(res => res.genRandomNumber) 可以正常获取
// exports.genRandomNumber = (n = 1) => { // import().then(res => res.genRandomNumber) 可以正常获取
// module.exports = genRandomNumber = (n = 1) => { // 需要通过 res.default.genRandomNumber 获取
  return Math.round(Math.random() * Math.pow(10, n))
});


/***/ })
]]);