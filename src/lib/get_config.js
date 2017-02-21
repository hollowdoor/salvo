import cosmiconfig from 'cosmiconfig';
import debugLog from 'debug';
import path from 'path';
import getHomeDir from 'os-homedir';
import camelCase from 'camelcase';
import getCurrentTime from './get_current_time.js';
const debug = debugLog('dataconfig');
const safeKeys = Object.assign(Object.create(null), {
    'commands': 1,
    'commandsSeries': 1,
    'commandsOptions': 1,
    'argv': 1
});

export default function getConfig(modName, flags){
    //console.log('modName ',modName)
    //const confname = `${modName}rc.yml`;
    const explorer = cosmiconfig(modName, {
        argv: false,
        cache: false,
        rcExtensions: true
    });

    return explorer.load(process.cwd())
    //return explorer.load(null, confname)
    .then(result=>{
        const config = result.config;

        Object.keys(config).forEach(key=>{
            config[camelCase(key)] = config[key];
        });

        Object.keys(flags).forEach(key=>{
            if(key in safeKeys){
                return;
            }
            if(key.length > 1 && config[key] !== flags[key]){
                config[key] = flags[key];
            }
        });

        Object.assign(config, {
            time: getCurrentTime(),
            cwd: path.join('{HOME}', path.relative(getHomeDir(), process.cwd())),
            write: getWrites(config)
        });


        debug('Config: %O\n', config);
        if('DEBUG'in process.env){
            Object.keys(config.commands).forEach(n=>{
                debug(`Command ${n} %O`, config.commands[n]);
            });
            Object.keys(config['commands-series']).forEach(n=>{
                debug(`Command-series ${n} %O`, config['commands-series'][n]);
            });
        }
        return result;
    });
}

function getWrites(config){
    let write = config['write'];
    if(typeof write !== 'object'){
        write = {};
    }

    return write;
}
