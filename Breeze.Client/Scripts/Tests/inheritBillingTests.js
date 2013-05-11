(function (testFns) {
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
    var newEmX = testFns.newEmX;

   

    module("inheritBilling", {
        setup: function () {
            testFns.setup({ serviceName: altServiceName } );
        },
        teardown: function () {
        }
    });

    test("query BillingTPHs", function() {
        var em = newEmX();

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
        var em = newEmX();

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

        }).fail(testFns.handleFail).fin(start);
    });

    test("export metadata", function () {
        var em = newEm();
        var ets = em.metadataStore.getEntityTypes();
       
        var exportedMs = em.metadataStore.exportMetadata();
        var em2 = newEm();

        em2.metadataStore.importMetadata(exportedMs);
        var ets2 = em2.metadataStore.getEntityTypes();
        ok(ets.length === ets2.length, "lengths should be the same");
    });

    //test("export entities", function () {
    //    var em = newEm();

    //    var q = EntityQuery.from("BillingDetailTPTs").take(1)
    //       .using(em);
    //    stop();
    //    var entity;
    //    q.execute().then(function (data) {
    //        var r = data.results;
    //        ok(r.length == 1, "should have found 1 result");
    //        entity = data.results[0];
    //        var q = EntityQuery.fromEntity(entity);
    //        return q.execute();
    //    }).then(function(data2) {
    //        ok(data2.results[0] === e)
        
    //    }).fail(testfns.handleFail).fin(start);
    //});

})(breezeTestFns);