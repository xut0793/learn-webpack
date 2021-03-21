(self["webpackChunk"] = self["webpackChunk"] || []).push([[0],[
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

// import { genRandomNumber } from './utils.js'
const genRandomNumber = __webpack_require__(0)

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'

  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  }
  // eleBtn.textContent = 'Click me to greet Tom'
  // eleBtn.onclick = function() {
  //   globalThis.greet('Tom')
  // }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())

/***/ })
],
0,[[1,1]]]);