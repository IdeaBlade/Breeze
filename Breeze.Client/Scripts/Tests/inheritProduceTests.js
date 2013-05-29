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

    var altServiceName = "breeze/ProduceTPH";

    var newEm = testFns.newEm;
    var newEmX = testFns.newEmX;

    if (testFns.DEBUG_MONGO) {
        test("Skipping inherit produce tests - DB not yet avail", function () {
            ok(true, "Skipped tests - Mongo");
        });
        return;
    };
    
    module("inheritProduce", {
        setup: function () {
            testFns.setup({ serviceName: altServiceName } );
        },
        teardown: function () {
        }
    });

    test("Localquery failing on inheritance entities1", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruits = data.results;

            var newQuery = new EntityQuery("Fruits");
            var fruits2 = manager.executeQueryLocally(newQuery);
            ok(true);
        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    });

    test("Localquery failing on inheritance entities2", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruits = data.results;

            manager.metadataStore.setEntityTypeForResourceName("Fruits", "Fruit");
            var newQuery = new EntityQuery("Fruits");
            var fruits2 = manager.executeQueryLocally(newQuery);
            ok(true);
        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    });

    test("EntityKey for ItemsOfProduce", function() {
        var em = newEmX();
        
        var rdAppleId = "D35E9669-2BAE-4D69-A27A-252B31800B74";
        var et = em.metadataStore.getEntityType("ItemOfProduce");
        
        var ek = new EntityKey(et, rdAppleId);
        stop();
        em.fetchEntityByKey(ek).then(function(data) {
            item = data.entity;
            ok(item, "item should have been found");
        
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("fetchEntityByKey Apple", function () {
        var em = newEmX();
        var blackBeansId = "D234F206-D0C8-40E3-9BF8-0ED190ED0C0C";
        var rdAppleId = "D35E9669-2BAE-4D69-A27A-252B31800B74";
        var appleType = em.metadataStore.getEntityType("Apple");
        stop();
        var item;
        em.fetchEntityByKey("Apple", rdAppleId).then(function(data) {
            item = data.entity;
            ok(item, "item should have been found");
            ok(data.fromCache === false, "should have been from database");
            ok(item.entityType === appleType);
            return em.fetchEntityByKey("Apple", rdAppleId, true);
        }).then(function(data2) {
            item = data2.entity;
            ok(item, "item should have been found");
            ok(data2.fromCache === true, "should have been from cache");
            ok(item.entityType === appleType);
        }).fail(testFns.handleFail).fin(start);
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
        ok(false, "Expected failure - OfType operator not yet supported - will be added later");
        return;
        
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
    

})(breezeTestFns);