QUnit.config.autostart = false;

// global timeout of 20 secs
// No test should take that long but first time db build can.
QUnit.config.testTimeout = 20000; 

// hack to delay QUnit.load until everything really is loaded
QUnit.delayedLoad = QUnit.load;
QUnit.load = function () { };

requirejs.config(
    {
        baseUrl: "tests",
        urlArgs: 'cb=' + Math.random(), // cache buster
    }
);

// Register 3rd party <script>-loaded libraries in Require container
define('breeze', function () { return window.breeze; });
define('$', function () { return window.jquery; });
define('ko', function () { return window.ko; });
define('Q', function () { return window.Q; });

require(["testFns" // always first

    // The test modules to run (prefix with comma):  
    , "basicTodoTests"
    , "queryTests"
    , "navigationTests"
    , "entityTests"
    , "entityExtensionTests"
    , "validationTests"
    , "metadataTests"
    , "saveTodoTests"
    , "saveConcurrentlyTests"
    , "exportImportTests"
    , "apiDirectTests"
    , "inheritanceTests"

], function (testFns) {
    $(function() {
        // Configure testfns as needed prior to running any tests
        QUnit.delayedLoad();
        QUnit.start(); //Tests loaded, run tests       
    });
});

