/**
 * 生成指定位数的随机整数
 */
// const genRandomNumber = (n = 1) => {
//   return Math.round(Math.random() * Math.pow(10, n))
// }

// import { genRandomNumber } from './utils.js'

// console.log('genRandomNumber', genRandomNumber())

/**
 * 生成按钮元素
 */
const genElement = () => {
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    // eleBtn.textContent = `Click me to generate random number: ${genRandomNumber(2)}`
    import(/* webpackChunkName: 'utils' */'./utils.js').then(res => {
      console.log('import res', res)
      eleBtn.textContent = `Click me to generate random number: ${res.genRandomNumber(2)}`
    })
  }

  return eleBtn
}

document.body.appendChild(genElement())