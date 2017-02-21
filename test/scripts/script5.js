const path = require('path');
console.log('---')
console.log('File name = ', path.join.apply(path, __filename.split(path.sep).slice(-2)))
console.log('process.argv ', process.argv.slice(2))
