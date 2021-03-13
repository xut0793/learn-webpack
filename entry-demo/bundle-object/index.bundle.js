/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
// import { genRandomNumber } from './utils.js'
// const { genRandomNumber } = require('./utils.js')

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack'

  const eleBtn = document.createElement('button')
  // eleBtn.textContent = 'Click me to generate random number: 0'
  // eleBtn.onclick = function() {
  //   eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
  // }
  eleBtn.textContent = 'Click me to greet Tom'
  eleBtn.onclick = function() {
    globalThis.greet('Tom')
  }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())
/******/ })()
;