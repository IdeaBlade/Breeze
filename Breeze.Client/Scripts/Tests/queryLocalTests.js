require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var Event = core.Event;
    
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
    
    module("local query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });
    
    
    test("executeQueryLocally for related entities after query", function () {
        var em = newEm();
        var query = entityModel.EntityQuery.from("Orders").take(10);
        var r;
        stop();
        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0);
            var q2 = EntityQuery.from("Orders").where("customer.companyName", "startsWith", "A");
            r = em.executeQueryLocally(q2);
            ok(r.length === 0);
            return em.executeQuery(q2);
        }).then(function (data2) {
            var r2 = data2.results;
            ok(r2.length > 0);
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("query deleted locally", function() {
        var em = newEm();

        var query = new EntityQuery().from("Customers").take(5);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length == 5, "should have 5 customers");
            var custs = em.executeQueryLocally(query);
            ok(custs.length == 5, "local query should have 5 customers");
            custs[0].entityAspect.setDeleted();
            custs[1].entityAspect.setDeleted();
            // var custs2 = em.executeQueryLocally(query);
            var custs2 = query.using(em).executeLocally();
            ok(custs2.length == 3);
            start();
        }).fail(testFns.handleFail);
              
    });

    test("query deleted locally with filter", function() {
        var em = newEm();

        var query = new EntityQuery().from("Customers")
            .where("companyName", "startsWith", "C");
        stop();
        em.executeQuery(query).then(function(data) {
            var count = data.results.length;
            ok(count > 0, "should have results");
            var custs = em.executeQueryLocally(query);
            ok(custs.length == count, "local query should have same number of customers");
            custs[0].entityAspect.setDeleted();
            custs[1].entityAspect.setDeleted();
            var custs2 = em.executeQueryLocally(query);
            ok(custs2.length == count - 2);
            start();
        }).fail(testFns.handleFail);
              
    });

   

    asyncTest("local query", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("freight", ">=", 500);


        em.executeQuery(query, function (data) {
            var orders = data.results;
            var ordersL = em.executeQueryLocally(query);
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            var orders2 = em.executeQueryLocally(query2);
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function (o) { return o.getProperty("freight") >= 500; }));
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("local query - fetchStrategy", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("freight", ">=", 500);

        var orders;
        em.executeQuery(query).then(function (data) {
            orders = data.results;
            query = query.using(FetchStrategy.FromLocalCache);
            return em.executeQuery(query);
        }).then(function (dataLocal) {
            var ordersL = dataLocal.results;
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            em.defaultQueryOptions = new QueryOptions({ fetchStrategy: FetchStrategy.FromLocalCache });
            return em.executeQuery(query2);
        }).then(function(data2) {
            var orders2 = data2.results;
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function(o) { return o.getProperty("freight") >= 500; }));
            start();
        }).fail(testFns.handleFail);
    });
    
    test("local query - ExecuteLocally", function() {
        // combined remote & local query gets all customers w/ 'A'
        var query = getQueryForCustomerA();

        // new 'A' customer in cache ... not saved
        var em = newEm();
        var newCustomer = addCustomer(em, "Acme");

        stop();
        executeComboQueryWithExecuteLocally(em, query).then(function (data) { // back from server with combined results
            var customers = data.results;
            ok(customers.indexOf(newCustomer) >= 0,
                "combo query results should include the unsaved newCustomer, " +
                    newCustomer.getProperty("companyName"));
        }).fail(testFns.handleFail).fin(start);
    });

    function executeComboQueryWithExecuteLocally(em, query) {
        query = query.using(em);
        return query.execute().then(function () {
            return Q.fcall(function () {
                var results = query.executeLocally();
                return { results: results };
            });
        });
    }
    
    test("local query - FetchStrategy.FromLocalCache", function () {
        // "combined remote & local query gets all customers w/ 'A'
        var query = getQueryForCustomerA();

        // new 'A' customer in cache ... not saved
        var em = newEm();
        var newCustomer = addCustomer(em, "Acme");

        stop();
        executeComboQueryWithFetchStrategy(em, query).then(function (data) { // back from server with combined results
            var customers = data.results;
            ok(customers.indexOf(newCustomer) >= 0,
                 "combo query results should include the unsaved newCustomer, " +
                newCustomer.getProperty("companyName"));
        }).fail(testFns.handleFail).fin(start);
    });

    function executeComboQueryWithFetchStrategy(em, query) {
        query = query.using(em);
        return query.execute().then(function() {
            return query.using(entityModel.FetchStrategy.FromLocalCache).execute();
        });
    }

    function getQueryForCustomerA() {
        return new EntityQuery("Customers")
            .where("companyName", "startsWith", "A")
            .orderBy("companyName");
    }

    function addCustomer(em, name) {
        var customerType = em.metadataStore.getEntityType("Customer");
        var cust = customerType.createEntity();
        cust.setProperty("companyName", name || "a-new-company");
        em.addEntity(cust);
        return cust;
    }


    
    return testFns;

});

