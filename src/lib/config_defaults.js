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

export { defaults, flagAliases };
