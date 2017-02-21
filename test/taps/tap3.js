var test = require('tape');

test('timing test 3', function (t) {
    t.plan(1);

    t.equal(typeof Date.now, 'function');
    var start = Date.now();

    /*setTimeout(function () {
        t.equal(Date.now() - start, 100);
    }, 100);*/
});
