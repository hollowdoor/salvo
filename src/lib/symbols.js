import debugLog from 'debug';
const debug = debugLog('datasym');

const sym = (function(){
    if(process.platform === 'win32'){
        return {
            clock: 'Clock',
            time: 'Time',
            ran: 'Ran',
            directory: 'Current directory',
            checkmark: '√',
            x: 'X'
        };
    }

    const red = '\x1b[31m';
    const green = '\x1b[32m';
    const gold = '\x1b[33m';
    const clear = '\x1b[0m';
    const magenta = '\x1b[35m';
    const bright = '\x1b[1m';

    return {
        clock: `\u25F7`,
        time: `${magenta}${bright}\u231B${clear}`,
        ran: `${red}\u2699${clear}`,
        dir: `${gold}\uD83D\uDCC2${clear}`,
        tick: `${green}\u2714${clear}`,
        x: `${red}\u2716${clear}`
    };
})();



Object.keys(sym)
.forEach(k=>debug(k, sym[k]))

export default sym;
