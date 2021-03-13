import './index.css'

const genElement = () => {
  const eleBox = document.createElement('div')
  eleBox.classList.add('container')
  const eleLogo = document.createElement('div')
  eleLogo.classList.add('logo')
  const eleP = document.createElement('p')
  eleP.textContent = 'Hello webpack'

  eleBox.appendChild(eleLogo)
  eleBox.appendChild(eleP)

  return eleBox
}

document.body.appendChild(genElement())