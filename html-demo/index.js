const { genRandomNumber } = require('./utils.js')

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