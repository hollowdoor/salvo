import StreamQueue from 'streamqueue';
import through2 from 'through2';
import stringStream from './string_stream.js';
import debugLog from 'debug';
const debug = debugLog('stream');

export default function getThroughStream(){

    let complete = false;
    let stream = new StreamQueue({
        pauseFlowingStream: true,
        resumeFlowingStream: true
    });

    const streamTypes = {
        _string(s){
            stream.queue(stringStream(s));
        },
        _function(fn){
            stream.queue(through2(fn));
        },
        _number(s){
            this._string(s);
        },
        _object(s){
            if(typeof s['pipe'] === 'function'){
                stream.queue(s);
            }else{
                this._string(s);
            }
        }
    };

    return {
        pipe(pipeTo){
            output = pipeTo;
            return stream.pipe(pipeTo);
        },
        add(...streams){
            streams.forEach(s=>{
                let type = '_' + (typeof s);
                streamTypes[type](s);
            });

            return this;
        },
        end(message){
            if(complete){ return this; }
            complete = true;
            if(typeof message !== 'undefined'){
                this.add(message + '');
            }
            outStream.done();
            return this;
        }
    };
}
