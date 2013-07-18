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
    
    test("getEntityByKey failing 1", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruit1 = data.results[0];
            var key = fruit1.getProperty("id");
            var fruit2 = manager.getEntityByKey("Fruit", key);
            ok(fruit1 === fruit2, "should be same entity");
        }).fail(testFns.handleFail).fin(start);
    });

    test("query with predicate failing on inheritance entities", function () {
        var manager = newEmX();

        var predicate = Predicate.create('name', '==', 'Apple')
            .or('name', '==', 'Orange')
            .or('name', '==', "Papa");

        var query = new breeze.EntityQuery()
            .from("Fruits")
            .where(predicate)
        // .toType('ItemOfProduce');  // this will fail because 'ItemOfProduce' does not have a 'name' property.
            .toType("Fruit");  // without this we get the "time" issue.

        stop();
        manager.executeQuery(query).then(function (data) {
            ok(true);
        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    });

    test("getEntityByKey failing 2", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("ItemsOfProduce");
        stop();
        manager.executeQuery(query).then(function (data) {
            var ioprod1 = data.results[0];
            var key = ioprod1.getProperty("id");
            var ioprod2 = manager.getEntityByKey("ItemOfProduce", key);
            ok(ioprod1 === ioprod2, "should be same entity");
        }).fail(testFns.handleFail).fin(start);
    });

    test("Localquery failing on inheritance entities1", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruits = data.results;

            // toType is needed because the "Fruits" resource does not map to any entityTypes. 
            var newQuery = new EntityQuery("Fruits").toType("Fruit");
            // uncomment next line to see detailed error message explaining the issue.
            // var newQuery = new EntityQuery("Fruits");
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