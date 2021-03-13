/**
 * 生成指定位数的随机整数
 */
exports.genRandomNumber = function(n) {
  return Math.round(Math.random() * Math.pow(10, n))
}