var external = Object.keys(require('./package.json').dependencies);
export default {
  entry: 'src/index.js',
  external: external,
  targets: [
        { dest: 'dist/bundle.js', format: 'cjs' },
        { dest: 'dist/bundle.es.js', format: 'es' }
    ],
    banner(){
        return '#!/usr/bin/env node';
    }
};
