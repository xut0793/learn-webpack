import './index.css'
function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  const eleP = document.createElement('p')
  eleP.textContent = 'Hello webpack css'
  eleDiv.appendChild(eleP)

  // 启动异步加载的按钮
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to load async-other.js'
  eleBtn.onclick = function() {
    import(/* webpackChunkName: 'async' */'./async-other.js').then(() => {
      console.log('异步加载成功')
    })
  }
  return eleDiv
}
document.body.appendChild(genElement())