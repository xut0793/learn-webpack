function writeOnly(a, b) {
  var x;
  var i = 300;
  while (i--) {
      x = a + b; // 只写不读
  }
}

function unexecuted() {
// 执行不了的判断
  var a = 2;
  if (a > 3) {
       return 3; // Dead Code
  }
// 执行不到的循环
while (false) {
       return 3; // Dead Code
  }

return a

// return 后的代码
a = 10
}

function unused() {
console.log('can not output')
}

(function run() {
writeOnly()
unexecuted()
let x = 1
console.log(x)
})()