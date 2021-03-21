/**
 * 生成指定位数的随机整数
 */

export default genRandomNumber = (n = 1) => { // import().then(res => res.genRandomNumber) 可以正常获取
// exports.genRandomNumber = (n = 1) => { // import().then(res => res.genRandomNumber) 可以正常获取
// module.exports = genRandomNumber = (n = 1) => { // 需要通过 res.default.genRandomNumber 获取
  return Math.round(Math.random() * Math.pow(10, n))
}
