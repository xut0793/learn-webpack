import './index.css'
import './global.js'
function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack tree shaking side effect'

  return eleDiv
}
document.body.appendChild(genElement())