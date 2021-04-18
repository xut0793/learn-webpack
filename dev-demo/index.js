import genRandomNumber from './utils/index.js'

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack watch set ignored'

  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function() {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber()}`
  }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())