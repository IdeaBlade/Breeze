
// Uncomment this line to run against a single file
// define(["breeze.debug"], function (root) {
// or uncomment this to run directly against source.
define(["root"], function (root) {

    "use strict";

    var core = root.core;
    var entityModel = root.entityModel;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    
    var testFns = {};
    testFns.message = "";

    testFns.setFlag = function (name, value) {
        testFns[name] = value;

        if (name === "DEBUG_KO") {
            if (testFns.DEBUG_KO) {
                testFns.entityTracking = entityModel.entityTracking_ko;
                testFns.message += "entityTracking: ko,  ";
            } else {
                testFns.entityTracking = entityModel.entityTracking_backingStore;
                testFns.message += "entityTracking: backingStore, ";
            }
            core.config.setProperties({
                trackingImplementation: testFns.entityTracking
            });
        }

        if (name === "DEBUG_WEBAPI") {
            if (testFns.DEBUG_WEBAPI) {
                testFns.remoteAccess = entityModel.remoteAccess_webApi;
                testFns.ServiceName = "api/NorthwindIBModel";
                testFns.message += "remoteAccess: webApi, ";
            } else {
                testFns.remoteAccess = entityModel.remoteAccess_odata;
                testFns.ServiceName = "http://localhost:9009/ODataService.svc";
                testFns.message += "remoteAccess: odataApi, ";
            }
            core.config.setProperties({
                remoteAccessImplementation: testFns.remoteAccess
            });
        }
    };
      
    testFns.newMs = function() {
        var ms = new MetadataStore({
            namingConventions: {
                serverPropertyNameToClient: function(serverPropertyName) {
                    return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
                },
                clientPropertyNameToServer: function(clientPropertyName) {
                    return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
                }            
            }
        });
        return ms;
    };
    
    testFns.newEm = function (metadataStore) {
        if (metadataStore) {
            return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: metadataStore });
        } else {
            if (!testFns.metadataStore) {
                testFns.metadataStore = testFns.newMs();
            }
            return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: testFns.metadataStore });
        }
    };

    testFns.setup = function(fn) {
        if (!testFns.metadataStore) {
            testFns.metadataStore = testFns.newMs();
        } 

        if (!testFns.metadataStore.isEmpty()) {
            if (fn) fn();
            return;
        }
        
        stop();
        var em = testFns.newEm();
        em.fetchMetadata(function(rawMetadata) {
            if (fn) fn();
            start();
        }).fail(testFns.handleFail);
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

