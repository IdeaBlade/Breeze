(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    
    var EntityQuery = breeze.EntityQuery;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

    var newEm = testFns.newEm;
    
    module("no tracking", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    test("simple query", function () {
        var em = newEm();
        var predicate1 = Predicate.create("lastName", "startsWith", "D").or("firstName", "startsWith", "A");
        
        var q = EntityQuery
            .from("Employees")
            .where(predicate1)
            .noTracking();
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var r2 = em.executeQueryLocally(q);
            ok(r2.length == 0);
        }).fail(testFns.handleFail).fin(start);
    });

    
    
    //test("sample", function () {
      
    //    var em = newEm();
    //    var q = EntityQuery.from("TimeLimits")
    //        .where("maxTime", "<", "PT4H")
    //        .take(20);
    //    stop();
    //    em.executeQuery(q).then(function (data) {
    //        var r = data.results;
    //        var r2 = em.executeQueryLocally(q);
    //        ok(r.length == r2.length);
    //    }).fail(testFns.handleFail).fin(start);
    //});
    



    
})(breezeTestFns);
