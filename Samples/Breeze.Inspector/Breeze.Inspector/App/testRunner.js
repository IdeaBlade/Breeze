QUnit.config.autostart = false;

// global timeout of 20 secs
// No test should take that long but first time db build can.
// QUnit.config.testTimeout = 20000;

requirejs.config(
    {
        baseUrl: "App/tests",

        // well-know paths to selected scripts
        paths: {
            'breeze': '../lib/breeze.debug' // debug version of breeze
        }
    }
);

require([
    "jobsShouldNotHaveDuplicates"
    , "changeNotificationShouldNotHappen"
    ,"wardsDupTests"
], function() {
    QUnit.start(); //Tests loaded, run tests
});