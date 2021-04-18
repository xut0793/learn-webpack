import Menu from './classMethod.js'

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack tree shaking class method'
  // eleDiv.textContent = 'Hello webpack tree shaking class method isShow: ' + (new Menu).isShow()

  return eleDiv
}
document.body.appendChild(genElement())