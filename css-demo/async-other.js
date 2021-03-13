import './async.css'
export function greet(name, targetEle) {
  const eleDiv = document.createElement('div')
  eleDiv.textContent = `How are you ? ${name}`
  eleDiv.classList.add('greet')
  targetEle.appendChild(eleDiv)
}
