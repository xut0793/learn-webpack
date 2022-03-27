/**
 * 生成指定位数的随机整数
 */

export default function genRandomNumber(n = 3) {
  console.log('test11')
  return Math.round(Math.random() * Math.pow(10, n))
}
