(self["webpackChunk"] = self["webpackChunk"] || []).push([[179],{

/***/ 10:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(288);
/* harmony import */ var _index_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(753);



function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack hash: cube(5)=' + (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.cube)(5)

  // 启动异步加载的按钮
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to load async.js'
  eleBtn.onclick = function() {
    __webpack_require__.e(/* import() | async */ 931).then(__webpack_require__.bind(__webpack_require__, 417)).then((res) => {
      console.log('异步加载成功', res)
      res.default()
    })
  }

  eleDiv.appendChild(eleBtn)
  return eleDiv
}
document.body.appendChild(genElement())

/***/ }),

/***/ 288:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "cube": () => (/* binding */ cube)
/* harmony export */ });
// import greet from './greet.js'

// greet('Tom')

function cube(x) {
  return x * x * x;
}

/***/ }),

/***/ 753:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ })

},
0,[[10,666]]]);