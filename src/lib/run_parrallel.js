import os from 'os';
import parseCommand from './parse_command.js';
import getCommandExec from './get_command_exec.js';
const cpu_count = (os.cpus().length || 1);
const dir = process.cwd();
const srx = /\s+/;

export default function runParrallel(_commands, options, commandOptions){

    const {
        output = {},
        limit = cpu_count
    } = options;

    const commands = [];
    //const internalOutput = getOutputStream(options);
    //internalOutput.pipe(output);
    const execCommand = getCommandExec(output);
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

        };
    });


}
