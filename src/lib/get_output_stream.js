import StreamQueue from 'streamqueue';
import tapMerge from 'tap-merge';
import stringStream from './string_stream.js';
import debugLog from 'debug';
const debug = debugLog('getio');

export default function getOutputStream({
    expectTap = false,
    quietLevel = 0
} = {}){

    let complete = false;
    let stdout = new StreamQueue({
        pauseFlowingStream: true,
        resumeFlowingStream: true
    });
    let stderr = new StreamQueue({
        pauseFlowingStream: true,
        resumeFlowingStream: true
    });

    let out = stdout;

    if(expectTap){
        out = out.pipe(tapMerge())
    }

    /*if(history.useHistory){
        out = out.pipe(createSave(config.filename));
    }

    if(config.out && config.out !== ''){
        try{
            out = out.pipe(createSave(config.save));
        }catch(e){
            return Promise.reject(
                new Error(`Can't save with "${config.save}" ${e}`)
            );
        }
    }*/

    out.pipe(process.stdout);

    stderr.pipe(process.stderr);

    return {
        stdout,
        stderr,
        add(child){
            if(typeof child === 'string'){
                stdout.queue(stringStream(child));
                return this;
            }
            stdout.queue(child.stdout);
            stderr.queue(child.stderr);
            return this;
        },
        end(message){
            if(complete){ return this; }
            complete = true;
            if(typeof message !== 'undefined'){
                this.add(message);
            }
            stdout.done();
            stderr.done();
            return this;
        }
    };
}
