

QUnit.config.autostart = false;
// QUnit.config.testTimeout = 5000;
QUnit.config.urlConfig.push({
    id: "canStart",
    label: "Start the tests",
    tooltip: "Allows a user to set options before tests start."
});

QUnit.config.urlConfig.push({
    id: "next",
    label: "Next tracking lib.",
    tooltip: "Next tracking lib."
});

QUnit.config.urlConfig.push({
    id: "sequential",
    label: "Start Sequential",
    tooltip: "Loads the modules one at a time, so that the Rerun link works."
});

var modules = [
    "attachTests",
    "classRewriteTests",
    "complexTypeTests",
    "entityManagerTests",
    "entityTests",
    "inheritBillingTests",
    "inheritProduceTests",
    "koSpecificTests",
    "metadataTests",
    "miscTests",
    "paramTests",
    "queryTests",
    "queryCtorTests",
    "queryDatatypeTests",
    "queryLocalTests",
    "queryNamedTests",
    "queryNonEFTests",
    "queryRawOdataTests",
    "querySelectTests",
    "saveTests",
    "validateTests",
    "validateEntityTests"
];

// require.config({ baseUrl: "Scripts/Tests" });
require.config({ baseUrl: "../" });

if (!QUnit.urlParams.sequential) {
    require(modules, function (testFns) {
        // QUnit.start();
        document.getElementById("title").appendChild(document.createElement('pre')).innerHTML = testFns.message;
        if (QUnit.urlParams.canStart) {
            QUnit.start(); //Tests loaded, run tests
        }

    });
}
else {
    function loadNext() {
        var module = modules.shift();
        if (module) {
            require.config({ baseUrl: "Scripts/Tests" });
            require([module], loadNext);
        } else {
            QUnit.start();
        }
    }
    loadNext();
}
