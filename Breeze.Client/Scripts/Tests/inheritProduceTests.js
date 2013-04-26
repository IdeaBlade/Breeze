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

    var altServiceName = "breeze/ProduceTPH";

    var newEm = testFns.newEm;
    var newEmX = testFns.newEmX;
    
    module("inheritProduce", {
        setup: function () {
            testFns.setup({ serviceName: altServiceName } );
        },
        teardown: function () {
        }
    });

 
    test("query ItemsOfProduce", function () {
        var em = newEmX();

        var q = EntityQuery.from("ItemsOfProduce")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("ItemOfProduce");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'ItemsOfProduce'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(testFns.handleFail).fin(start);

    });

    test("query Fruits w/server ofType", function () {
        var em = newEmX();

        var q = EntityQuery.from("Fruits")
            .using(em);
        stop();
        var fruitType = em.metadataStore.getEntityType("Fruit");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'Fruits'");
            ok(r.every(function(f) {
                return f.entityType.isSubtypeOf(fruitType);
            }));
            
        }).fail(testFns.handleFail).fin(start);
            
    });
    
    test("query Fruits w/client ofType", function () {
        var em = newEmX();

        var q = EntityQuery.from("ItemsOfProduce")
            .where(null, FilterQueryOp.IsTypeOf, "Fruit")
            .using(em);
        stop();
        var fruitType = em.metadataStore.getEntityType("Fruit");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'Fruits'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(fruitType);
            }));

        }).fail(testFns.handleFail).fin(start);

    });

    test("query Fruits locally", function () {
        var em = newEmX();

        var q = EntityQuery.from("Fruits")
            .using(em);
        stop();
        
        q.execute().then(function (data) {
            var fruits = data.results;
            ok(fruits.length > 0, "should have found some 'Fruits'");
            // var q2 = q;
            var q2 = q.toType("Fruit");
            var fruits2 = em.executeQueryLocally(q2);
            ok(fruits2.length === fruits.length);
            
        }).fail(testFns.handleFail).fin(start);

    });
    

    return testFns;

});

