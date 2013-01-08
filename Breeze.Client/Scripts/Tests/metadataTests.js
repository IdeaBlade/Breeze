/// <reference path="datajs/datajs-1.1.0.js" />
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
    

    var EntityType = breeze.EntityType;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var NamingConvention = breeze.NamingConvention;
    var EntityQuery = breeze.EntityQuery;

    var newEm = testFns.newEm;

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

    test("registerEntityType", function() {

        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(testFns.newMs());

        em1.metadataStore.registerEntityTypeCtor("Region", function() {
            this.foo = "foo";
        }, function(entity) {
            entity.bar = "bar";
        });
        var q = EntityQuery.from("Regions").take(2);
        stop();
        em1.executeQuery(q).then(function(data) {
            ok(data.results.length === 2);
            var region = data.results[0];
            // 4 = 3 mapped + 1 unmapped ( foo) - should be no mention of 'bar'
            ok(region.entityType.dataProperties.length === 4, "should only have 4 properties");
            ok(region.bar === "bar", "bar property should = 'bar'");
            var regionType = em1.metadataStore.getEntityType("Region");
            var bundle = em1.exportEntities();
            var em2 = new EntityManager();
            em2.metadataStore.registerEntityTypeCtor("Region", function () {
                this.foo = "foo";
            }, function (entity) {
                entity.bar = "bar";
            });
            
            em2.importEntities(bundle);
            var ents = em2.getEntities();
            ents.forEach(function(ent) {
                ok(ent.entityType.dataProperties.length === 4, "should only have 4 properties");
                ok(ent.bar === "bar", "bar property should = 'bar'");
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("initialization", function () {

        var store = new MetadataStore({ namingConvention: NamingConvention.none } );
        stop();
        var dataService = core.config.getAdapterInstance("dataService");
        dataService.fetchMetadata(store, testFns.serviceName, function () {

            var typeMap = store._structuralTypeMap;
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
            typeMap = store._structuralTypeMap;
            ok(true, "should get here");
            sc.start();
        }, errFn);
        dataService.fetchMetadata(store, testFns.serviceName, function () {
            typeMap = store._structuralTypeMap;
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
