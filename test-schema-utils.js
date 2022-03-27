const { validate } = require('schema-utils')
const sechma = require('./test-schema.json')

const options = {
  port: '8080', //服务器端口
  host: '127.0.0.1', //服务器地址
  username: 121323, //用户名
  password: 'your password', //密码
  from: '/dist/', //你的本地路径
  to: '/path/to/', //服务器上的路径
}

const ret = validate(sechma, options, {
  name: 'sftp config',
  baseDataPath: 'options',
})
// console.log(ret)
