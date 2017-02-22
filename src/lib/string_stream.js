import stream from 'stream'
export default function stringStream(str){
    const s = new stream.Readable();
    s._read = function noop() {}; // redundant?
    s.push(str + '');
    s.push(null);
    return s;
}
