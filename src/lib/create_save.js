import through2 from 'through2';
import { createWriteStream } from 'fs';

export default function createSave(name){
    try{
        const ws = createWriteStream(name);
        const t = through2(function(chunk, enc, callback){
            ws.write(chunk);
            this.push(chunk);
            callback();
        });
        return t;
    }catch(e){
        throw e;
    }

}
