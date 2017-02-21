import isGlob from 'is-glob';
import glob from 'glob-promise';
import minimatch from 'minimatch';
import commandExists from 'command-exists';
const srx = /\s+/;

export default function parseCommand(command, commandOptions, write){
    let [cmd, ...args] = command.split(srx);

    

    if(isGlob(cmd)){

        return glob(cmd).then(files=>{

            return files.map(file=>{
                return {
                    command: file,
                    args: args,
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
                args: args,
                type: 'spawn',
                options: commandOptions
            }];
        }, ()=>{
            return [{
                command: cmd,
                args: args,
                type: 'fork',
                options: commandOptions
            }];
        });
    }
}
