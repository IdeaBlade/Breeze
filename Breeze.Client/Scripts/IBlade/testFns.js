
// Uncomment this line to run against a single file
// define(["breeze.debug"], function (root) {
// or uncomment this to run directly against source.
define(["root"], function (root) {

    "use strict";

    var core = root.core;
    var entityModel = root.entityModel;
    var testFns = {};
    testFns.message = "";

    testFns.setFlag = function (name, value) {
        testFns[name] = value;

        if (name === "DEBUG_KO") {
            if (testFns.DEBUG_KO) {
                core.config.trackingImplementation = entityModel.entityTracking_ko;
                testFns.message += "entityTracking: ko,  ";
            } else {
                core.config.trackingImplementation = entityModel.entityTracking_backingStore;
                testFns.message += "entityTracking: backingStore, ";
            }
        }

        if (name === "DEBUG_WEBAPI") {
            if (testFns.DEBUG_WEBAPI) {
                testFns.remoteAccess = entityModel.remoteAccess_webApi;
                core.config.remoteAccessImplementation = entityModel.remoteAccess_webApi;
                testFns.ServiceName = "api/NorthwindIBModel";
                testFns.message += "remoteAccess: webApi, ";
            } else {
                testFns.remoteAccess = entityModel.remoteAccess_odata;
                core.config.remoteAccessImplementation = entityModel.remoteAccess_odata;
                testFns.ServiceName = "http://localhost:9009/ODataService.svc";
                testFns.message += "remoteAccess: odataApi, ";
            }
        }
    };

    testFns.assertIsSorted = function (collection, propertyName, isDescending) {
        isDescending = isDescending || false;
        var fn = function (a, b) {
            // localeCompare has issues in Chrome.
            // var compareResult = a[propertyName].localeCompare(b.propertyName);
            var av = a.getProperty(propertyName);
            var bv = b.getProperty(propertyName);
            var compareResult = av < bv ? -1 : (av > bv ? 1 : 0);
            return isDescending ? compareResult : compareResult * -1;
        };
        var arrayCopy = collection.map(function (o) { return o; });
        arrayCopy.sort(fn);
        ok(core.arrayEquals(collection, arrayCopy), propertyName + "not sorted correctly");

    };

    testFns.handleFail = function (error) {
        if (error.handled === true) return;
        ok(false, "failed");
        if (error.message) {
            ok(false, error.message);
        } else {
            ok(false, "Failed: " + error.toString());
        }
        start();
    };

    testFns.morphStringProp = function (entity, propName) {
        var val = entity.getProperty(propName);
        var newVal = testFns.morphString(val);
        entity.setProperty(propName, newVal);
        return newVal;
    };

    testFns.morphString = function (str) {
        if (!str) {
            return "_X";
        }
        if (str.length > 1 && core.stringEndsWith(str, "_X")) {
            return str.substr(0, str.length - 2);
        } else {
            return str + "_X";
        }
    };

    testFns.StopCount = function (count) {
        this.count = count;
        stop();
    };

    testFns.StopCount.prototype.start = function () {
        this.count--;
        if (!this.count) {
            start();
            return true;
        } else {
            return false;
        }
    };

    testFns.StopCount.prototype.handleFail = function (error) {
        ok(false, "failed");
        if (error.message) {
            ok(false, error.message);
        } else {
            ok(false, "Failed: " + error.toString());
        }
        this.start();
    };

    testFns.output = function (text) {
        document.body.appendChild(document.createElement('pre')).innerHTML = text;
    };

    testFns.root = root;

    return testFns;
});

