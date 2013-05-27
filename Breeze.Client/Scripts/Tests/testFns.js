
// Uncomment these lines to run against base + individual plugins.
//define(["breeze.base",
//        "breeze.ajax.jQuery",
//        "breeze.modelLibrary.ko", "breeze.modelLibrary.backbone", "breeze.modelLibrary.backingStore",
//        "breeze.dataService.webApi", "breeze.dataService.odata"
//    ], function (breeze) {


// Uncomment this line to run against base + individual plugins (minified)
// define(["breeze.min"], function(breeze) {

// Uncomment this to run against a version of base and all plugins
breezeTestFns = (function (breeze) {

    "use strict";

    var core = breeze.core;
    
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var NamingConvention = breeze.NamingConvention;
    var DataType = breeze.DataType;
    
    var testFns = {};
    
    testFns.TEST_RECOMPOSITION = true;
    configQunit();

    function configQunit() {
        QUnit.config.autostart = false;

        // global timeout of 20 secs
        // No test should take that long but first time db build can.
        QUnit.config.testTimeout = 20000;

        QUnit.config.urlConfig.push({
            id: "next",
            label: "Next tracking lib.",
            tooltip: "Next tracking lib."
        });

        QUnit.config.urlConfig.push({
            id: "canStart",
            label: "Start the tests",
            tooltip: "Allows a user to set options before tests start."
        });

    }
    
    function updateTitle() {
        testFns.title = "dataService: " + (testFns.dataService || "--NONE SPECIFIED --") + ", modelLibrary: " + testFns.modelLibrary;
    }
    
    testFns.setDataService = function (value) {

        value = value.toLowerCase();
        testFns.DEBUG_WEBAPI = value === "webapi";
        testFns.DEBUG_ODATA = value === "odata";
        testFns.DEBUG_MONGO = value === "mongo";
        
        if (testFns.DEBUG_WEBAPI) {
            testFns.dataService = core.config.initializeAdapterInstance("dataService", "webApi").name;

            if (testFns.TEST_RECOMPOSITION) {
                var oldAjaxCtor = core.config.getAdapter("ajax");
                var newAjaxCtor = function () {
                    this.name = "newAjax";
                    this.defaultSettings = {
                        headers: { "X-Test-Header": "foo1" },
                        beforeSend: function (jqXHR, settings) {
                            jqXHR.setRequestHeader("X-Test-Before-Send-Header", "foo1");
                        }
                    };
                };
                newAjaxCtor.prototype = new oldAjaxCtor();
                core.config.registerAdapter("ajax", newAjaxCtor);
                core.config.initializeAdapterInstance("ajax", "newAjax", true);
            } else {
                var ajaxImpl = core.config.getAdapterInstance("ajax");
                ajaxImpl.defaultSettings = {
                    headers: { "X-Test-Header": "foo2" },
                    beforeSend: function (jqXHR, settings) {
                        jqXHR.setRequestHeader("X-Test-Before-Send-Header", "foo2");
                    }
                };
            }
            // test recomposition
            testFns.defaultServiceName = "breeze/NorthwindIBModel";
            
        } else if (testFns.DEBUG_ODATA) {
            testFns.dataService = core.config.initializeAdapterInstance("dataService", "OData").name;
            testFns.defaultServiceName = "http://localhost:9009/ODataService.svc";
        } else if (testFns.DEBUG_MONGO) {
            testFns.dataService = core.config.initializeAdapterInstance("dataService", "mongo").name;
            testFns.defaultServiceName = "breeze/NorthwindIBModel";
        }
        updateTitle();
        setWellKnownData();
    };

    function setWellKnownData() {
        testFns.wellKnownData = {
            // ID of the Northwind "Alfreds Futterkiste" customer
            alfredsID: '785efa04-cbf2-4dd7-a7de-083ee17b6ad2',
            // ID of the Northwind "Nancy Davolio" employee
            nancyID: 1,
            // Key values of a Northwind "Alfreds Futterkiste"'s OrderDetail
            alfredsOrderDetailKey: { OrderID: 10643, ProductID: 28 /*R�ssle Sauerkraut*/ },
            // ID of Chai product
            chaiProductID: 1
        };

        if (testFns.DEBUG_MONGO) {
            testFns.wellKnownData.nancyID = 1001;
            testFns.orderKeyName = "_id";
            testFns.customerKeyName = "_id";
            testFns.employeeKeyName = "_id";
            testFns.productKeyName = "_id";
            testFns.userKeyName = "_id";
        }   else {

            testFns.orderKeyName = "orderID";
            testFns.customerKeyName = "customerID";
            testFns.employeeKeyName = "employeeID";
            testFns.productKeyName = "productID"
            testFns.userKeyName = "id";
        }

    }

    testFns.configure = function () {
        
        var modelLibrary = window.localStorage.getItem("modelLibrary") || "ko";
        var oldNext = !!window.localStorage.getItem("qunit.next");
        
        var curNext = !!QUnit.urlParams.next;
        
        if (curNext) {
            window.localStorage.setItem("qunit.next", true);
        } else {
            window.localStorage.removeItem("qunit.next");
        }
        var doNext = oldNext != curNext;
        
        if (doNext) {
            if (modelLibrary === "ko") {
                modelLibrary = "backbone";
            } else if (modelLibrary === "backbone") {
                modelLibrary = "backingStore";
            } else {
                modelLibrary = "ko";
            }
        }
        
        window.localStorage.setItem("modelLibrary", modelLibrary);
        core.config.initializeAdapterInstance("modelLibrary", modelLibrary, true);
        testFns.modelLibrary = core.config.getAdapterInstance("modelLibrary").name;
        updateTitle();
    };

    testFns.setup = function (config) {
        config = config || {};
        // config.serviceName - default = testFns.defaultServiceName
        // config.serviceHasMetadata - default = true
        // config.metadataFn - default = null
        var serviceHasMetadata = (config.serviceHasMetadata === undefined) ? true : false;
        if (config.serviceName == null || config.serviceName.length === 0) {
            if (testFns.serviceName != testFns.defaultServiceName) {
                testFns.serviceName = testFns.defaultServiceName;
                testFns.metadataStore = null;
            }
        } else {
            if (testFns.serviceName !== config.serviceName) {
                testFns.serviceName = config.serviceName;
                testFns.metadataStore = null;
            }
        }

        if (config.noMetadata) return;

        if (!testFns.metadataStore) {
            testFns.metadataStore = testFns.newMs();
        }

        if (!testFns.metadataStore.isEmpty()) {
            if (config.metadataFn) config.metadataFn();
            return;
        }

        
        var em = testFns.newEm();
        if (serviceHasMetadata) {
            stop();
            em.fetchMetadata(function (rawMetadata) {
                if (config.metadataFn) config.metadataFn();
            }).fail(testFns.handleFail).fin(start);
        } 
    };

    testFns.newMs = function() {
        var namingConv = new NamingConvention({
            name: "camelCase2",
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
            return new EntityManager({ serviceName: testFns.serviceName, metadataStore: metadataStore });
        } else {
            if (!testFns.metadataStore) {
                testFns.metadataStore = testFns.newMs();
            }
            return new EntityManager({ serviceName: testFns.serviceName, metadataStore: testFns.metadataStore });
        }
    };

    testFns.newEmX = function () {
        return testFns.newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
    };

    testFns.handleFail = function (error) {
        if (!error) {
            ok(false, "unknown error");
            // start();
            return;
        }
        if (error.handled === true) return;
        
        if (error instanceof (Error)) {
            var msg = (error.message || "") + ((error.responseText && " responseText: " + error.responseText) || "");
            ok(false, "Failed: " + msg);
        } else {
            ok(false, "error is not an error object; error.status: " + error.status + "  error.message: " + error.message + "-" + error.responseText);
        }
        // start();
        return;
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
    
    testFns.assertIsSorted = function (collection, propertyName, dataType, isDescending, isCaseSensitive) {
        isCaseSensitive = isCaseSensitive == null ? true : isCaseSensitive;
        var fn = function (a, b) {
            // localeCompare has issues in Chrome.
            // var compareResult = a[propertyName].localeCompare(b.propertyName);
            return compare(a, b, propertyName, dataType, isDescending, isCaseSensitive);
        };
        var firstTime = true;
        var prevItem;
        var isOk = collection.every(function (item) {
            if (firstTime) {
                firstTime = false;
            } else {
                var r = fn(prevItem, item);
                if (r > 0) {
                    return false;
                }                 
            }
            prevItem = item;
            return true;
        });

        ok(isOk, propertyName + " not sorted correctly");

    };

    function compare(a, b, propertyName, dataType, isDescending, isCaseSensitive) {
        var value1 = a.getProperty(propertyName);
        var value2 = b.getProperty(propertyName);
        value1 = value1 === undefined ? null : value1;
        value2 = value2 === undefined ? null : value2;
        if (dataType === DataType.String) {
            if (!isCaseSensitive) {
                value1 = (value1 || "").toLowerCase();
                value2 = (value2 || "").toLowerCase();
            }
        } else {
            var normalize = getComparableFn(dataType);
            value1 = normalize(value1);
            value2 = normalize(value2);
        }
        if (value1 == value2) {
            return 0;
        } else if (value1 > value2 || value2 === undefined) {
            return isDescending ? -1 : 1;
        } else {
            return isDescending ? 1 : -1;
        }
    }

    function getComparableFn(dataType) {
        if (dataType && dataType.isDate) {
            // dates don't perform equality comparisons properly 
            return function (value) { return value && value.getTime(); };
        } else if (dataType === DataType.Time) {
            // durations must be converted to compare them
            return function (value) { return value && __durationToSeconds(value); };
        } else {
            return function (value) { return value; };
        }

    }

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

    testFns.models = {};
    var models = testFns.models;
    
    models.Customer = function () {
        if (testFns.modelLibrary == "ko") {
            return function () {
                this.companyName = ko.observable(null);
            };
        } else if (testFns.modelLibrary == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    companyName: null
                }
            });
        } else {
            return function () {
                this.companyName = null;
            };
        }
    };

    models.CustomerWithMiscData = function () {
        if (testFns.modelLibrary == "ko") {
            return function () {
                this.miscData = ko.observable("asdf");
            };
        } else if (testFns.modelLibrary == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    miscData: "asdf"
                }
            });
        } else {
            return function () {
                this.miscData = "asdf";
            };
        }
    };

    models.Product = function () {
        var init = function (entity) {
            ok(entity.entityType.shortName === "Product", "entity's productType should be 'Product'");
            ok(entity.getProperty("isObsolete") === false, "should not be obsolete");
            entity.setProperty("isObsolete", true);
        };
        if (testFns.modelLibrary == "ko") {
            return function () {
                this.isObsolete = ko.observable(false);
                this.init = init;
            };
        } else if (testFns.modelLibrary == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    isObsolete: false,
                },
                init: init
            });
        } else {
            return function () {
                this.isObsolete = false;
                this.init = init;
            };
        }
    };
    
    models.Location = function () {
        var init = function (entity) {
            ok(entity.complexType.shortName === "Location", "complexType should be 'Location'");

        };
        if (testFns.modelLibrary == "ko") {
            return function () {
                this.extraName = ko.observable("xtra");
                this.init = init;
            };
        } else if (testFns.modelLibrary == "backbone") {
            return Backbone.Model.extend({
                defaults: {
                    extraName: "xtra"
                },
                init: init
            });
        } else {
            return function () {
                this.extraName = "xtra";
                this.init = init;
            };
        }
    };

    testFns.sizeOf = sizeOf;

    testFns.sizeOfDif = sizeOfDif;

    function sizeOf(value, level) {
        if (level == undefined) level = 0;
        var bytes =0, keyBytes = 0;
        var children = null;
        if (value == null) {
            bytes = 1; // not sure how much space a null or undefined take.
        } else if (typeof value === 'boolean') {
            bytes = 4;
        } else if (typeof value === 'string') {
            bytes = value.length * 2;
        } else if (typeof value === 'number') {
            bytes = 8;
        } else if (typeof value === 'object') {
            if (value['__visited__']) return null;
            value['__visited__'] = 1;
            children = [];
            for (var propName in value) {
                if (propName !== "__visited__") {
                    var r = sizeOf(value[propName], 1);
                    if (r != null && r.size !== 0) {
                        bytes += r.size;
                        r.name = propName;
                        children.push(r);
                    }
                }
            }
        }

        if (level == 0) {
            clearVisited(value);
        }
        if (children) {
            children.sort(function(a, b) {
                return b.size - a.size;
            });
            var alt = {};
            children.forEach(function(c) {
                alt[c.name] = c;
            });
            children = alt;
        }
        return {
            size: bytes,
            children: children
        };
    };
    
    function sizeOfDif(s1, s2) {
        
        var dif = (s1.size || 0) - (s2.size || 0);
        var s1Val, s2Val, oDif;
        if (dif === 0) return null;
        var children = [];
        var s1Children = s1.children || {};
        var s2Children = s2.children || {};
        for (var s1Key in s1Children) {
            s1Val = s1Children[s1Key];
            s2Val = s2Children[s1Key];
            if (s2Val) {
                s2Val.visited = true;
                oDif = sizeOfDif(s1Val, s2Val);
                if (oDif) {
                    oDif.name = s1Key;
                    children.push(oDif);
                }
            } else {
                oDif = { name: s1Key, dif: s1Val.size, s1Children: s1Val.children };
                children.push(oDif);
            }
        }
        for (var s2Key in s2Children) {
            s2Val = s2Children[s2Key];
            if (!s2Val.visited) {
                oDif = { name: "-" + s2Key, dif: -1 * s2Val.size, s2Children: s2Val.children };
                children.push(oDif);
            }
        }

        var alt = {};
        children.forEach(function(c) {
            alt[c.name] = c;
        });
        children = alt;

        return { dif: dif, children: children };
    }

    function clearVisited(value) {
        if (value == null) return;
        if (typeof value == 'object' && value["__visited__"]) {
            delete value['__visited__'];
            for (var i in value) {
                clearVisited(value[i]);
            }
        }
    }


    testFns.breeze = breeze;
    testFns.configure();

    return testFns;
})(breeze);

