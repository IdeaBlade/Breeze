QUnit.config.autostart = false;

requirejs.config(
    {
        baseUrl: "Scripts/Tests",

        // well-know paths to selected scripts
        paths: {
            'breeze': '../lib/breeze.debug' // debug version of breeze
        }
    }
);   

require(["testFns" // always first

    // The test modules to run (prefix with comma):  
    , "simpleQueryTests"
    , "createEntityTests"
    // , "attachTests"
    //, "testsPrototype"

], function (testFns) {
    // Configure testfns as needed prior to running any tests
        
    QUnit.start(); //Tests loaded, run tests
});

