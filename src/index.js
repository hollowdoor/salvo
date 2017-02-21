import meow from 'meow';
import resolveCwd from 'resolve-cwd';
import getConfig from './lib/get_config.js';
import runAll from './lib/run_all.js';
import { spawn } from 'child_process';
import { defaults, flagAliases } from './lib/config_defaults.js';

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
