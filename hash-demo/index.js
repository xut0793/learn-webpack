import { cube } from './utils.js';
import './index.css'

function genElement() {
  const eleDiv = document.createElement('div')
  eleDiv.classList.add('hello')
  eleDiv.textContent = 'Hello webpack hash: cube(5)=' + cube(5)

  // 启动异步加载的按钮
  const eleBtn = document.createElement('button')
  eleBtn.textContent = 'Click me to load async.js'
  eleBtn.onclick = function() {
    import(/* webpackChunkName: 'async' */'./async.js').then((res) => {
      console.log('异步加载成功', res)
      res.default()
    })
  }

  eleDiv.appendChild(eleBtn)
  return eleDiv
}
document.body.appendChild(genElement())