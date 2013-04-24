require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    
    var EntityQuery = breeze.EntityQuery;
    var DataService = breeze.DataService;
    var MetadataStore = breeze.MetadataStore;
    var NamingConvention = breeze.NamingConvention;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

    var altServiceName = "breeze/Inheritance";

    var newEm = testFns.newEm;
  
    module("inheritBilling", {
        setup: function () {
            testFns.setup({ serviceName: altServiceName } );
        },
        teardown: function () {
        }
    });

    test("query BillingTPHs", function() {
        var em = newEm();

        var q = EntityQuery.from("BillingDetailTPHs")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("BillingDetailTPH");
        q.execute().then(function(data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'BillingDetailTPH'");
            ok(r.every(function(f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(function(e) {
            ok(false, e.message);
        }).fin(start);
    });
    
    test("query BillingTPT", function () {
        var em = newEm();

        var q = EntityQuery.from("BillingDetailTPTs")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("BillingDetailTPT");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'BillingDetailTPT'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(function (e) {
            var x = e;
        }).fin(start);
    });

    return testFns;

});

