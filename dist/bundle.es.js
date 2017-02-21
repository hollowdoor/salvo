#!/usr/bin/env node
import meow from 'meow';
import resolveCwd from 'resolve-cwd';
import cosmiconfig from 'cosmiconfig';
import debugLog from 'debug';
import path$1 from 'path';
import getHomeDir from 'os-homedir';
import camelCase from 'camelcase';
import dateFormat from 'dateformat';
import os from 'os';
import isGlob from 'is-glob';
import glob from 'glob-promise';
import 'minimatch';
import commandExists from 'command-exists';
import { fork, spawn } from 'child_process';
import through2 from 'through2';
import { createWriteStream } from 'fs';
import StreamQueue from 'streamqueue';
import tapMerge from 'tap-merge';
import stream from 'stream';
import redent from 'redent';

function getCurrentTime(){
    const m = Date.now();
    const now = new Date(m);
    return {
        safe: dateFormat(now, "dddd_mmmm_dS_yyyy_h.MM.ss_TT"),
        pretty: dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT"),
        utc: now.toUTCString(),
        milliseconds: m
    };
}

const debug = debugLog('dataconfig');
const safeKeys = Object.assign(Object.create(null), {
    'commands': 1,
    'commandsSeries': 1,
    'commandsOptions': 1,
    'argv': 1
});

function getConfig(modName, flags){
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
            cwd: path$1.join('{HOME}', path$1.relative(getHomeDir(), process.cwd())),
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

const srx$1 = /\s+/;

function parseCommand(command, commandOptions, write){
    let [cmd, ...args] = command.split(srx$1);



    if(isGlob(cmd)){

        return glob(cmd).then(files=>{

            return files.map(file=>{
                return {
                    command: file,
                    args,
                    type: 'fork',
                    options: commandOptions
                };
            });
        });
    }else{
        return commandExists(cmd)
        .then(()=>{
            return [{
                command: cmd,
                args,
                type: 'spawn',
                options: commandOptions
            }];
        }, ()=>{
            return [{
                command: cmd,
                args,
                type: 'fork',
                options: commandOptions
            }];
        });
    }
}

const defaultOptions = {
    fork: {
        stdio: [process.stdin, 'pipe', 'pipe', 'ipc'],
        detached: false,
        cwd: process.cwd()
    },
    spawn: {
        stdio: [process.stdin, 'pipe', 'pipe'],
        detached: false,
        cwd: process.cwd(),
        shell: true
    }
};

function combineOptions(command){
    return Object.assign(
        {
            cwd: process.cwd()
        },
        command.options,
        defaultOptions[command.type]
    );
}

const execCom = {
    fork(command, output){

        return new Promise((resolve, reject)=>{
            let child = fork(
                command.command,
                command.args,
                combineOptions(command)
            );

            output.add(child);

            child.on('exit', (code)=>{
                if(code === 1){
                    reject(
                        new Error(`In file "${command.command}": Uncaught Exception code ${code}`)
                    );
                }else if(code){
                    reject(new Error(`"${command.command}" Failed with: ${code}`));
                }
                resolve(code);
            });
            child.on('error', reject);
        });

    },
    spawn(command, output){

        return new Promise((resolve, reject)=>{
            let child = spawn(
                command.command,
                command.args,
                combineOptions(command)
            );

            output.add(child);

            child.on('exit', (code)=>{
                if(code === 1){
                    reject(
                        new Error(`In file "${command.command}": Uncaught Exception code ${code}`)
                    );
                }else if(code){
                    reject(new Error(`"${command.command}" Failed with: ${code}`));
                }
                resolve(code);
            });
            child.on('error', reject);
        });
    }
};

function getCommandExecutor(output){
    return function execCommand(command){
        return execCom[command.type](command, output);
    };
}

const cpu_count = (os.cpus().length || 1);
const dir = process.cwd();
function runParrallel(_commands, options, commandOptions){

    const {
        output = {},
        limit = cpu_count
    } = options;

    const commands = [];
    //const internalOutput = getOutputStream(options);
    //internalOutput.pipe(output);
    const execCommand = getCommandExecutor(output);
    let pending = 0;

    return new Promise((resolve, reject)=>{

        function getOnExitCB(command){

            return function onExit(code){

                --pending;

                if(!_commands.length && !commands.length && !pending){
                    return resolve();
                }

                run();

            };
        }

        run();

        function next(){
            if(pending < limit){
                process.nextTick(run);
            }
        }

        function getDir(cmdName){
            if(cmdName in dirs){
                return dirs[cmdName];
            }
            return dir;
        }

        function run(){

            if(pending < limit && pending < commands.length){
                ++pending;
                return process.nextTick(run);
            }

            if(commands.length){
                let command = commands.shift();
                //execCom[command.type](command);
                execCommand(command)
                .then(getOnExitCB())
                .catch(reject);
            }

            if(!_commands.length){
                return;
            }

            parseCommand(_commands.shift(), commandOptions)
            .then(cmds=>{
                [].push.apply(commands, cmds);
                next();
            })
            .catch(reject);

        }
    });


}

function stringStream(str){
    const s = new stream.Readable();
    s._read = function noop() {}; // redundant?
    s.push(str);
    s.push(null);
    return s;
}

const debug$1 = debugLog('getio');

function getOutputStream({
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
        out = out.pipe(tapMerge());
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

const debug$2 = debugLog('datasym');

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
.forEach(k=>debug$2(k, sym[k]));

function startSummary(){
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

function runAll(input, options){

    const {
        commands = {},
        commandsSeries = {},
        commandsOptions = {},
    } = options;

    let series = commandsSeries;

    const getSummary = startSummary();
    const output = getOutputStream(options);
    const runOptions = Object.assign(
        Object.create(null),
        options,
        {output}
    );


    function getOptions(cmdName){
        if(cmdName in commandsOptions){
            return commandsOptions[cmdName];
        }
        return {};
    }

    function runSeries(series){
        return series.reduce((p, cmdName, i)=>{
            return p.then(()=>{
                const cmdOptions = getOptions(cmdName);
                if(cmdName in commands){
                    return runParrallel(
                        commands[cmdName],
                        runOptions,
                        cmdOptions
                    );
                }
                return runParrallel(
                    [cmdName], runOptions, cmdOptions);
            });
        }, Promise.resolve([]));
    }

    function onCommand(p, commandName){

        return p.then(()=>{
            if(commandName in series){
                return runSeries(series[commandName]);
            }else if(commandName in commands){
                return runParrallel(
                    commands[commandName],
                    runOptions,
                    getOptions(commandName)
                );
            }
            return runParrallel(
                [commandName],
                runOptions,
                getOptions(commandName)
            );
        });
    }

    let pending = input.reduce(onCommand, Promise.resolve(null));

    /*

    Maybe parrallel?

    function onCommand(commandName){
        if(commandName in series){
            return runSeries(series[commandName]);
        }else if(commandName in commands){
            return runParrallel(commands[commandName], runOptions);
        }
        return runParrallel([commandName], runOptions);
    }

    let pending = Promise.all(
        input.map(onCommand)
    );*/


    return pending.then(()=>{
        output.end(getSummary(options));
    });


}

const defaults = {
    expectTap: false,
    quietLevel: 0,
    timeout: '',
    out: '',
    history: ''
};

defaults['expect-tap'] = false;

const flagAliases = {
    e: 'expect-tap',
    t: 'timeout',
    q: 'quiet-level',
    o: 'out',
    h: 'history'
};

const cli = meow(`
    Usage
      $ salvo <commands ...>

    Options:
        -e --expect-tap Combine any tap output from test scripts
        -t --timeout    Stop running after a time limit
        -q --quiet      Suppress stdout, but not stderr
        -o --out        Save stdout output to a file
        -h --history    A folder to put time stamped output files

    Examples:
      $ salvo test/*.js
      $ salvo test/*.js -e | tap-spec
      $ salvo test/*.js -f=filename
`, {
    alias: flagAliases,
    default: defaults
});

(function main(){



    if(!cli.input.length || 'help' in cli.flags){
        return cli.showHelp();
    }

    if(runLocal()){
        return;
    }

    getConfig('salvo', cli.flags)
    .then(config=>{
        return runAll(cli.input, config.config);
    })
    .catch(e=>console.error(`
    Error:

    ${e}

    `)
    );
})();

function runLocal(){
    const localRun = resolveCwd('salvo');

    //Copied from the nice ava project.
    if(localRun && path.relative(localRun, __filename) !== ''){

        const argv = [localRun].concat(process.argv.slice(2));

        const cp = spawn('node', argv, {
            stdio: 'inherit',
            cwd: process.cwd()
        });

        cp.on('exit', code=>{
            if(code > 0){
                main();
            }
        });
        return true;
    }

    return false;
}
