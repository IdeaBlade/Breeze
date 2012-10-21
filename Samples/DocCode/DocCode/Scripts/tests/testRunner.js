QUnit.config.autostart = false;

// global timeout of 20 secs
// No test should take that long but first time db build can.
QUnit.config.testTimeout = 20000; 


requirejs.config(
    {
        baseUrl: "Scripts/Tests",
        urlArgs: 'cb=' + Math.random(), // cache buster

        // well-know paths to selected scripts
        paths: {
            'breeze': '../breeze.debug' // debug version of breeze
        }
    }
);   

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
    , "exportImportTests"
    , "apiDirectTests"

], function (testFns) {
    // Configure testfns as needed prior to running any tests
        
    QUnit.start(); //Tests loaded, run tests
});

