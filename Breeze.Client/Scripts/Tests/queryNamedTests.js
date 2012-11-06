require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;
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


    module("named query", {
        setup: function () {

        },
        teardown: function () {

        }
    });

    if (!testFns.DEBUG_WEBAPI) {
        test("Skipping named query tests - not available for thru Odata", function () {
            ok(false, "Skipped tests - ok to fail");
        });
        return testFns;
    };

    
    test("project strings", function () {
        var em = newEm();
        
        var query = EntityQuery.from("CompanyNames")
            .take(5)
            .using(em);
        stop();
        query.execute().then(function (data) {
            var names = data.results[0];
            ok(names.length > 0);
            ok(typeof names[0] === 'string');
        }).fail(function (e) {
            testFns.handleFail(e);
        }).fin(start);
    });
    
    test("project primitive objects", function () {
        var em = newEm();

        var query = EntityQuery.from("CompanyNamesAndIds")
            .take(5)
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length === 5);
            ok(results[0].companyName, results[0].companyName);
            ok(results[0].customerID, results[0].customerID);
        }).fail(function (e) {
            testFns.handleFail(e);
        }).fin(start);
    });

    test("project enumerables", function() {
        var em = newEm();
        var query = EntityQuery.from("TypeEnvelopes")
            .take(5)
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length === 5);
            ok(results[0].name);
            ok(results[0].namespace);
            ok(results[0].fullName);
        }).fail(function (e) {
            testFns.handleFail(e);
        }).fin(start);
    });
    
    test("project enumerables with filter", function () {
        var em = newEm();
        var query = EntityQuery.from("TypeEnvelopes")
            .where("name.length",">", 10)
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length > 0);
            ok(results[0].name.length > 10);
            ok(results[0].namespace);
            ok(results[0].fullName);
        }).fail(function (e) {
            testFns.handleFail(e);
        }).fin(start);
    });
    
    test("project primitive objects with filter", function () {
        var em = newEm();

        var query = EntityQuery.from("CompanyNamesAndIds")
            .where("companyName", "startsWith", "A")
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length > 0);
            results.forEach(function(r) {
                ok(r.companyName.substr(0, 1) === "A", "should start with an 'A'");
                ok(r.customerID, "should have a customerId");
            });
        }).fail(function (e) {
            testFns.handleFail(e);
        }).fin(start);
    });

    
    test("project objects containing entities", function () {
        var em = newEm();

        var query = EntityQuery.from("CompanyInfoAndOrders").take(5)
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length === 5);
            ok(results[0].companyName, results[0].companyName);
            ok(results[0].customerID, results[0].customerID);
            ok(results[0].orders);
            results[0].orders.forEach(function (o) {
                var aspect = o.entityAspect;
                ok(aspect, "should have an entityAspect");
                ok(aspect.entityManager === em, "should have the correct em");
                ok(aspect.entityState.isUnchanged(), "entity state should be unchanged");
            });
        }).fail(function (e) {
            testFns.handleFail(e);
        }).fin(start);
    });

    
    test("server side simple filter", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersStartingWithA");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0, "should have some results");
            start();
        }).fail(testFns.handleFail);
    });

    test("server side include many with filter - customers and orders", function () {
        stop();
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("companyName", "startsWith", "A")
            .orderBy("companyName")
            .take(4);
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 2, "no customers found");
            testFns.assertIsSorted(customers, "companyName", em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), 'should have a companyName property');
                var orders = c.getProperty("orders");
                ok(orders.length > 0, "orders should be populated");
                var matchingCust = orders[0].getProperty("customer");
                ok(c === matchingCust, "relationship not updated");
                var ckey = c.entityAspect.getKey();
                ok(ckey, "missing key");
                var c2 = em.findEntityByKey(ckey);
                ok(c2 === c, "cust not cached");
                var okey = orders[0].entityAspect.getKey();
                var o2 = em.findEntityByKey(okey);
                ok(o2 === orders[0], "order not cached");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("server side include many with take - customers and orders", function () {
       
        expect(5);
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("companyName", FilterQueryOp.StartsWith, "C")
            .take(1);

        var sc = new testFns.StopCount(2);

        em.executeQuery(query, function (data) {

            ok(data.results.length === 1, "query should only return a single cust");
            var cust = data.results[0];
            var custKey = cust.entityAspect.getKey();
            var orders = cust.getProperty("orders");
            var orderKeys = orders.map(function (o) { return o.entityAspect.getKey(); });
            var custQuery = EntityQuery.fromEntities(cust);

            var ordersQuery = EntityQuery.fromEntities(orders);
            var em2 = newEm();

            em2.executeQuery(custQuery, function (data2) {
                ok(data2.results.length === 1, "a single customer should have been fetched");
                var cust2 = data2.results[0];
                var cust2Key = cust2.entityAspect.getKey();
                ok(custKey.equals(cust2Key), "customer keys do not match");
                em2.clear();
                sc.start();
            }).fail(sc.handleFail);

            em2.executeQuery(ordersQuery, function (data3) {
                var orders3 = data3.results;
                ok(orders3.length === orders.length, "orders query results are the wrong length");
                var order3Keys = orders3.map(function (o) { return o.entityAspect.getKey(); });
                ok(core.arrayEquals(orderKeys, order3Keys, EntityKey.equals), "orders query do not return the correct entities");
                sc.start();
            }).fail(sc.handleFail);
        });
    });

    test("server side include, followed by local query", function () {
       
        stop();
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("companyName", "startsWith", "A")
            .orderBy("companyName")
            .take(4);
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query).then(function (data) {
            var customers = data.results;
            ok(customers.length == 4, "wrong number of customers");

            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), 'should have a companyName property');
                var orders = c.getProperty("orders");
                ok(orders.length > 0, "Orders should be populated");
                var matchingCust = orders[0].getProperty("customer");
                ok(c === matchingCust, "relationship not updated");
                var ckey = c.entityAspect.getKey();
                ok(ckey, "missing key");
                var c2 = em.findEntityByKey(ckey);
                ok(c2 === c, "cust not cached");
                var okey = orders[0].entityAspect.getKey();
                var o2 = em.findEntityByKey(okey);
                ok(o2 === orders[0], "order not cached");
            });
            start();
        }).fail(testFns.handleFail);
    });

    return testFns;
});