//import commandExists from 'command-exists';
import executable from 'executable';
import isGlob from 'is-glob';
import glob from 'glob-promise';
import debugLog from 'debug';
const debug = debugLog('datacommands');

const s = /\s+/;

function addCmdName(commands, name){
    if(!(name in commands)){
        commands[name] = [];
    }
}

function resolveCommand(p, name, cmd){
    const [command, ...args] = cmd.split(s);
    console.log('command ',command)

    if(isGlob(command)){
        return Promise.all([p, glob(command)])
        .then(([commands, files])=>{
            return commands.concat(
                files.map(file=>{
                    return {
                        type: 'script',
                        name, args, cmd
                    };
                })
            );
        });
    }

    return Promise.all([p, executable(command)])
    .then(([commands, ex])=>{
        if(ex){
            return commands.concat([{
                type: 'shell',
                name, args, cmd,
            }]);
        }

        return commands.concat([{
            type: 'script',
            name, args, cmd
        }]);
    });

}

function resolveCommands(p, name, _commands){
    return _commands.reduce((p, cmd)=>{
        return resolveCommand(p, name, cmd);
    }, p);
}


export default function getCommands(input, conf){
    console.log('conf ',conf)
    const _commands = conf.config.commands;
    const _series = conf.config['commands-series'];

    const normal = Promise.resolve([]);

    const commands = input.reduce((p, name, i)=>{
        if(name in _series){
            let c = _series[name].reduce((p2, key, k)=>{

                let c = resolveCommands(
                    Promise.resolve([]), key, _commands[key]
                );

                return Promise.all([p2, c])
                .then(([p21, c])=>{
                    console.log('p2 ',p21)
                    return p21.concat([c]);
                });

            }, Promise.resolve([]));

            return Promise.all([p, c])
            .then(([commands, c])=>{
                return commands.concat([c]);
            });
        }

        if(name in _commands){
            let c = resolveCommands(
                Promise.resolve([]),
                name,
                _commands[name]
            );

            return Promise.all([p, c])
            .then(([commands, c])=>{
                commands[0].push(c);
                return commands;
            });
        }

        return p;
    }, Promise.resolve([[]]));

    return commands.then(commands=>{
        debug('commands %O',commands);
        if('DEBUG' in process.env){
            commands.forEach((c, i)=>{
                debug(`cmds ${i} %O`,c);
            });
        }
        return commands;
    }).catch(e=>console.log(e));
}
