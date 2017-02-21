const path = require('path');
console.log('---')
console.log('File name = ', path.join.apply(path, __filename.split(path.sep).slice(-2)))
console.log('process.argv ', process.argv.slice(2))


function startLoop(){
    let index = 3;
    function loop(){
        if(!--index){ return; }
        setTimeout(function(){
            console.log('loop index ',index)
            loop();
        }, 500);
    }
    loop();

}

startLoop();
