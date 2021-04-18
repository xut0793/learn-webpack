// import { cube } from './math.js'; // 能 tree shaking 掉 square
import { cube, square } from './math.js'; // 同样可以 tree shaking 掉 square
const result = cube(5)
console.log(`cube(5) = ${result}`)