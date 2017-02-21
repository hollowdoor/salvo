import runParrallel from './run_parrallel.js';
import getOutputStream from './get_output_stream.js';
import startSummary from './start_summary.js';

export default function runAll(input, options){

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
