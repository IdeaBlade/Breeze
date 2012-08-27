QUnit.config.autostart = false;
require.config({ baseUrl: "Scripts/Tests" });
require([
    "paramTests",
    "miscTests",
    "attachTests",
    "classRewriteTests",
    "metadataTests",
    "entityManagerTests",
    "entityQueryCtorTests",
    "entityTests",
    "queryTests",
    "validateTests",
    "validateEntityTests",
    "saveTests"

], function (testFns) {
    testFns.setFlag("DEBUG_WEBAPI", DEBUG_WEBAPI);
    testFns.setFlag("DEBUG_KO", DEBUG_KO);
    document.getElementById("message").appendChild(document.createElement('pre')).innerHTML = testFns.message;
    QUnit.start(); //Tests loaded, run tests

});

