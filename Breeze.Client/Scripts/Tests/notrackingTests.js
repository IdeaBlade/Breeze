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

    test("original ctor", function () {
        
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
