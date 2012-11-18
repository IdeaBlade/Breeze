require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
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
    
    module("query select", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });
    
   
    test("select - anon simple", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("companyName", "startsWith", "C")
            .select("companyName");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.companyName);
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select - anon collection", function () {
        var em = newEm();

        var query = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "C")
            .select("orders");
        if (!testFns.DEBUG_WEBAPI) {
            query = query.expand("orders");
        }
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(Array.isArray(a.orders));
                a.orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("select - anon simple, entity collection projection", function () {
        var em = newEm();

        var query = new EntityQuery("Customers")
            .where("companyName", "startsWith", "C")
            .orderBy("companyName")
            .select("companyName, orders");
        if (!testFns.DEBUG_WEBAPI) {
            query = query.expand("orders");
        }        
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(Object.keys(a).length === 2,"should have 2 properties");
                ok(a.companyName);
                ok(Array.isArray(a.orders));
                a.orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select - anon simple, entity scalar projection", function () {
        
        var em = newEm();
        
        var query = EntityQuery
            .from("Orders")
            .where("customer.companyName", "startsWith", "C")
            .orderBy("customer.companyName");
        if (testFns.DEBUG_WEBAPI) {
            query = query.select("customer.companyName, customer, orderDate");
        } else {
            query = query.select("customer, orderDate");
            query = query.expand("customer");
        }
            
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var customerType = em.metadataStore.getEntityType("Customer");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                if (testFns.DEBUG_WEBAPI) {
                    ok(Object.keys(a).length === 3, "should have 3 properties");
                    ok(typeof(a.customer_CompanyName) === 'string', "customer_CompanyName is not a string");
                } else {
                    ok(Object.keys(a).length === 2, "should have 2 properties");
                }
                ok(a.customer.entityType === customerType, "a.customer is not of type Customer");
                ok(a.orderDate !== undefined, "OrderDate should not be undefined");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("select - anon two props", function () {
        
        var em = newEm();
        var query = EntityQuery
            .from("Products")
            .where("category.categoryName", "startswith", "S")
            .select("productID, productName");
        stop();
        em.executeQuery(query).then(function(data) {
            var r = data.results;
            ok(r.length > 0);
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select with expand should fail with good msg", function () {

        var em = newEm();
        var query = EntityQuery
            .from("Products")
            .where("category.categoryName", "startswith", "S")
            .expand("category")
            .select("productID, productName");
        stop();
        em.executeQuery(query).then(function(data) {
            var r = data.results;
            ok(r.length > 0);
            start();
        }).fail(function(e) {
            ok(e.message.indexOf("expand")>=0);
            start();
        });
    });


    return testFns;

});

