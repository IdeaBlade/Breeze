
//requirejs.config({
//    shim: {
//        'breeze.ajax.jQuery': ['breeze'],
//        'breeze.entityTracking.ko': ['breeze'],
//        'breeze.entityTracking.backbone': ['breeze'],
//        'breeze.entityTracking.backingStore': ['breeze'],
//        'breeze.remoteAccess.webApi': ['breeze', 'breeze.ajax.jQuery'],
//        'breeze.remoteAccess.odata': ['breeze']
//    }
//});

// Uncomment these lines to run against base + individual plugins.
//define(["breeze",
//        "breeze.ajax.jQuery",
//        "breeze.entityTracking.ko", "breeze.entityTracking.backbone", "breeze.entityTracking.backingStore",
//        "breeze.remoteAccess.webApi", "breeze.remoteAccess.odata"
//    ], function (root) {
// or uncomment this to run directly against source.
define(["breezeWith"], function (root) {

    "use strict";

    var core = root.core;
    var entityModel = root.entityModel;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var NamingConvention = entityModel.NamingConvention;
    var DataType = entityModel.DataType;
    
    var testFns = {};
    testFns.message = "";

    testFns.configure = function () {
        var trackingOption = window.localStorage.getItem("trackingOption");

        var oldNext = !!window.localStorage.getItem("qunit.next");
        var curNext = !!QUnit.config.next;
        if (curNext) {
            window.localStorage.setItem("qunit.next", true);
        } else {
            window.localStorage.removeItem("qunit.next");
        }
        var doNext = oldNext != curNext;
        
        if (doNext) {
            if (trackingOption == null || trackingOption === "ko") {
                trackingOption = "backbone";
            } else if (trackingOption === "backbone") {
                trackingOption = "backingStore";
            } else {
                trackingOption = "ko";
            }
        }
        
        window.localStorage.setItem("trackingOption", trackingOption);
        testFns.trackingOption = trackingOption;
        testFns.message += testFns.message += "entityTracking: " + trackingOption + ",  ";
        core.config.initializeInterface("entityTracking", trackingOption);
        testFns.entityTracking = core.config.getDefaultImplementation("entityTracking");
    };

    var models = {};
    testFns.models = models;

    models.Customer = function() {
        if (testFns.trackingOption == "ko") {
            return function() {
                this.companyName = ko.observable(null);
            };
        } else if (testFns.trackingOption == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    companyName: null
                }
            });
        } else {
            return function() {
                this.companyName = null;
            };
        }
    };
    
    models.CustomerWithMiscData = function () {
        if (testFns.trackingOption == "ko") {
            return function() {
                this.miscData = ko.observable("asdf");
            };
        } else if (testFns.trackingOption == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    miscData: "asdf"
                }
            });
        } else {
            return function() {
                this.miscData = "asdf";
            };
        }
    };


    models.Product = function() {
        var init = function(entity) {
            ok(entity.entityType.shortName === "Product", "entity's productType should be 'Product'");
            ok(entity.getProperty("isObsolete") === false, "should not be obsolete");
            entity.setProperty("isObsolete", true);
        };
        if (testFns.trackingOption == "ko") {
            return function() {
                this.isObsolete = ko.observable(false);
                this.init = init;
            };
        } else if (testFns.trackingOption == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    isObsolete: false,
                },
                init: init
            });
        } else {
            return function() {
                this.isObsolete = false;
                this.init = init;
            };
        }
    };

    testFns.TEST_RECOMPOSITION = true;

    testFns.setFlag = function (name, value) {
        testFns[name] = value;

        if (name === "DEBUG_WEBAPI") {
            if (testFns.DEBUG_WEBAPI) {
                testFns.remoteAccess = core.config.initializeInterface("remoteAccess", "webApi");
                
                if (testFns.TEST_RECOMPOSITION) {
                    var oldAjaxCtor = core.config.getInterface("ajax");
                    var newAjaxCtor = function() {
                        this.name = "newAjax";
                        this.defaultSettings = {
                            headers: { "X-Test-Header": "foo1" },
                            beforeSend: function (jqXHR, settings) {
                                jqXHR.setRequestHeader("X-Test-Before-Send-Header", "foo1");
                            }
                        };
                    };
                    newAjaxCtor.prototype = new oldAjaxCtor();
                    core.config.registerInterface("ajax", newAjaxCtor, true);
                } else {
                    var ajaxImpl = core.config.getDefaultImplementation("ajax");
                    ajaxImpl.defaultSettings = {
                        headers: { "X-Test-Header": "foo2" },
                        beforeSend: function(jqXHR, settings) {
                            jqXHR.setRequestHeader("X-Test-Before-Send-Header", "foo2");
                        }
                    };
                }
                // test recomposition
                testFns.ServiceName = "api/NorthwindIBModel";
                testFns.message += "remoteAccess: webApi, ";
            } else {
                testFns.remoteAccess = core.config.initializeInterface("remoteAccess", "OData");
                testFns.ServiceName = "http://localhost:9009/ODataService.svc";
                testFns.message += "remoteAccess: odataApi, ";
            }

        }
    };
      
    testFns.newMs = function() {
        var namingConv = new NamingConvention({
            serverPropertyNameToClient: function (serverPropertyName, prop) {
                if (prop && prop.isDataProperty && prop.dataType === DataType.Boolean) {
                    return "is" + serverPropertyName;
                } else {
                    return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
                }
            },
            clientPropertyNameToServer: function (clientPropertyName, prop) {
                if (prop && prop.isDataProperty && prop.dataType === DataType.Boolean) {
                    return clientPropertyName.substr(2);
                } else {
                    return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
                }
            }            
        });
        var altNamingConv = NamingConvention.camelCase;
        namingConv.setAsDefault();
        // var ms = new MetadataStore({ namingConvention: namingConv });
        var ms = new MetadataStore();
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
        if (!error) {
            ok(false, "unknown error");
            start();
            return;
        }
        if (error.handled === undefined) {
            ok(false, "error is not an error object; error.status: " + error.status + "  error.message: " + error.message);
            start();
            return;
        }
        if (error.handled === true) return;
        ok(false, "failed");
        if (error.message) {
            ok(false, error.message);
        } else {
            ok(false, "Failed: " + error.toString());
        }
        start();
    };

    testFns.getDups = function(items) {
        var uniqueItems = [];
        var dups = [];
        items.forEach(function(item) {
            if (uniqueItems.indexOf(item) === -1) {
                uniqueItems.push(item);
            } else {
                dups.push(item);
            }
        });
        return dups;
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
    
    testFns.assertIsSorted = function (collection, propertyName, isDescending, isCaseSensitive) {
        isCaseSensitive = isCaseSensitive == null ? true : isCaseSensitive;
        var fn = function (a, b) {
            // localeCompare has issues in Chrome.
            // var compareResult = a[propertyName].localeCompare(b.propertyName);
            var av = a.getProperty(propertyName);
            var bv = b.getProperty(propertyName);
            if (typeof av === "string" && !isCaseSensitive) {
                av = av.toLowerCase();
                bv = (bv || "").toLowerCase();
            }
            var compareResult = av < bv ? -1 : (av > bv ? 1 : 0);
            return isDescending ? compareResult*-1 : compareResult;
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
    testFns.setFlag("DEBUG_WEBAPI", DEBUG_WEBAPI);
    testFns.configure();

    return testFns;
});

