var test = require('tape');

test('timing test 1', function (t) {
    t.plan(1);

    t.equal(typeof Date.now, 'function');
    var start = Date.now();
    //t.equal(false, true);

    /*setTimeout(function () {
        t.equal(Date.now() - start, 100);
    }, 100);*/
});
