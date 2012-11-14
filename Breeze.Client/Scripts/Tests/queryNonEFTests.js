require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    var entityModel = breeze.entityModel;
    var EntityQuery = entityModel.EntityQuery;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityKey = entityModel.EntityKey;
    var FilterQueryOp = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;
    var QueryOptions = entityModel.QueryOptions;
    var FetchStrategy = entityModel.FetchStrategy;
    var MergeStrategy = entityModel.MergeStrategy;

    var newEm = testFns.newEm;
    
    module("queryNonEF", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });
    
    
    test("getEntities after query", function() {
        var em = newEm();
        var query = entityModel.EntityQuery.from("Categories");
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0); //this returns 45 results
            var ents = em.getEntities();
            ok(ents.length > 0); // this returns 0 results. WHY????
        }).fail(testFns.handleFail).fin(start);
        
    });
    

    
    


    return testFns;

});

