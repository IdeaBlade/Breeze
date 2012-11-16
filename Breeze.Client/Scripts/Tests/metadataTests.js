/// <reference path="datajs/datajs-1.0.2.js" />
/// <reference path="q/q.js"/>
/// <reference path="OQuery/oQuery.mod.js"/>
/// <reference path="iblade/core.js" />
/// <reference path="iblade/entitymetadata.js"/>
/// <reference path="iblade/entitymanager.js"/>
/// <reference path="iblade/entity.js"/>
// above stuff for resharper - but doesn't work

require.config({ baseUrl: "Scripts/IBlade" });
define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var entityModel = breeze.entityModel;

    var EntityType = entityModel.EntityType;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var NamingConvention = entityModel.NamingConvention;

    module("metadata", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    test("default interface impl", function() {
        var store = new MetadataStore();
        stop();
        store.fetchMetadata(testFns.serviceName).then(function() {
            ok(!store.isEmpty());
            start();
        }).fail(testFns.handleFail);
    });
    
    test("initialization", function () {

        var store = new MetadataStore({ namingConvention: NamingConvention.none } );
        stop();
        var dataService = core.config.getAdapterInstance("dataService");
        dataService.fetchMetadata(store, testFns.serviceName, function () {

            var typeMap = store._entityTypeMap;
            var types = objectValues(typeMap);
            ok(types.length > 0);
            var custType = store.getEntityType("Customer");
            var props = custType.dataProperties;
            ok(props.length > 0);
            var keys = custType.keyProperties;
            ok(keys.length > 0);
            var prop = custType.getProperty("CustomerID");
            ok(prop);
            ok(prop.isDataProperty);
            var navProp = custType.navigationProperties[0];
            ok(navProp.isNavigationProperty);
            var notProp = custType.getProperty("foo");
            ok(!notProp);
            equal(prop.name, keys[0].name);
            start();
        });
    });

    test("initialize only once", function() {
        var store = new MetadataStore();
        var em = new EntityManager({ serviceName: testFns.serviceName, metadataStore: store });
        stop();
        store.fetchMetadata(testFns.serviceName).then(function() {
            ok(!store.isEmpty());
            ok(store.hasMetadataFor(testFns.serviceName));
            ok(em.metadataStore.hasMetadataFor(em.serviceName), "manager serviceName is not the same as the metadataStore name");
            start();
        }).fail(testFns.handleFail);
    });

    test("initialization concurrent", 2, function () {

        var store = new MetadataStore();
        var sc = new testFns.StopCount(2);
        var typeMap;
        var errFn = function (e) {
            ok(false, e);
            sc.start();
        };
        var dataService = core.config.getAdapterInstance("dataService");
        dataService.fetchMetadata(store, testFns.serviceName, function () {
            typeMap = store._entityTypeMap;
            ok(true, "should get here");
            sc.start();
        }, errFn);
        dataService.fetchMetadata(store, testFns.serviceName, function () {
            typeMap = store._entityTypeMap;
            ok(true, "should also get here");
            sc.start();
        }, errFn);
    });

    function objectValues(obj, deep) {
        deep = deep || false;
        var result = [];
        for (var name in obj) {
            if (deep || obj.hasOwnProperty(name)) {
                result.push(obj[name]);
            }
        }
        return result;
    }

    return testFns;
});
