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

require(["testFns"], function (testFns) {

    // Configure testfns as needed prior to running any tests

    require(["testFns" // placeholder

    // The test modules to run (prefix with comma):  
    , "simpleQueryTests"
    , "createEntityTests"
    //, "attachTests"
    //, "testsPrototype"
    
    ], QUnit.start()); //Tests loaded, run tests

});
