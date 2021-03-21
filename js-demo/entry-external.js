import _ from 'lodash'

// const eleDiv = document.createElement('div')
// eleDiv.textContent = _.join(['Hello', 'lodash'], ' ')

// document.body.appendChild(eleDiv)

function getMsg () {
  console.log(_.join(['Hello', 'lodash'], ' '))
}

export default getMsg