import { spawn, fork } from 'child_process';

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

export default function getCommandExecutor(output){
    return function execCommand(command){
        return execCom[command.type](command, output);
    };
}
