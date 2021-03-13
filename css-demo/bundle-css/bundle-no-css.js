/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
// import './index.css'

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack css'
  eleDiv.classList.add('hello')
  return eleDiv
}
document.body.appendChild(genElement())
/******/ })()
;