import genRandomNumber from './utils/index.js'

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = 'Hello webpack dev server'

  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to generate random number: 0'
  eleBtn.onclick = function () {
    eleBtn.textContent = `Click me to generate random number: ${genRandomNumber()}`
  }
  eleDiv.appendChild(eleBtn)

  return eleDiv
}
document.body.appendChild(genElement())

if (module.hot) {
  module.hot.accept()
  console.log('热更新了wewe', module.hot)
}
