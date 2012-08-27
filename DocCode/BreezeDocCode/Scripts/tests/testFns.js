
define(["breeze"], function (breeze) {

    "use strict";

    var core = breeze.core,
        entityModel = breeze.entityModel,
        testFns = {
            breeze: breeze,
            northwindServiceName: "api/Northwind",
            todoServiceName: "api/todos"
        };

    core.config.trackingImplementation = entityModel.entityTracking_ko;
    core.config.remoteAccessImplementation = entityModel.remoteAccess_webApi;

    // Creates a typical function for making new EntityManagers
    // usage: 
    //    var serviceName = testFns.northwindServiceName,
    //        metadataStore = new MetadataStore(),
    //        newEm = testFns.emFactory(serviceName, metadataStore);
    //    ...
    //    var em = newEm();
    testFns.emFactory = function (serviceName, metadataStore) {
        return function () {
            return new entityModel.EntityManager({ serviceName: serviceName, metadataStore: metadataStore });
        };
    };

    // Typical setup and teardown logic for a test module in this project
    // usage: 
    //    var serviceName = testFns.northwindServiceName,
    //        metadataStore = new MetadataStore(),
    //        newEm = testFns.emFactory(serviceName, metadataStore);
    //    module("testModuleName", testFns.moduleSetupTeardown(newEm, metadataStore));
    testFns.moduleSetupTeardown = function (newEm, metadataStore, metadataSetupFn) {
        return {
            setup: testFns.moduleSetup(newEm, metadataStore, metadataSetupFn),
            teardown: function () {}
        };
    };

    // Typical setup logic for a test module in this project    
    testFns.moduleSetup = function (newEm, metadataStore, metadataSetupFn) {
        return function () {
            if (!metadataStore.isEmpty()) {
                ok(true, "metadata already defined");
                return; // already setup
            }
            var em = newEm();
            stop();

            em.fetchMetadata(function (rawMetadata) {
                var isEmptyMetadata = metadataStore.isEmpty();
                ok(!isEmptyMetadata, "got metadata from service " + em.serviceName);
                if (typeof metadataSetupFn === "function") {
                    metadataSetupFn(metadataStore);
                }
                start();
            });
        };
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


    return testFns;
});

