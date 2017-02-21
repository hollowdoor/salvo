import sym from './symbols.js';
import redent from 'redent';

export default function startSummary(){
    const start = Date.now();
    return function getSummary(info){
        return redent(`
            ${sym.clock}  - ${info.time.pretty || ''}
            ${sym.time}  - ${Date.now() - start} milliseconds
            ${sym.ran}  - exec path "${process.execPath}"
            ${sym.dir}  - "${info.cwd}"
            Node.js version - "${process.version}"
        `, 4) + '\n';
    };


}
