// CommonJS
// const { cube } = require('./math.js')
// console.log(`cube(5) = ${cube(5)}`)

// ES Module
// import { cube } from './math.js'
// console.log(`cube(5) = ${cube(5)}`)

// asnyc load
function genElement() {
  // 启动异步加载的按钮
  const eleBtn = document.createElement('button')
  eleBtn.textContent = `Click me to async load math`
  eleBtn.onclick = function() {
    console.log('btn click');
    import(
      /* webpackChunkName: 'math-async' */
      './math.js').then((res) => {
      console.log(`异步加载成功`, res)
      eleBtn.textContent = `Click me to async load math: cube(5) = ${res.cube(5)}`
    })
  }
  return eleBtn
}
document.body.appendChild(genElement())
// import(
//   /* webpackChunkName: 'math-preload' */
//   /* webpackPreload: true */
//   './math.js').then((res) => {
//   console.log(`异步加载成功`, res)
// })