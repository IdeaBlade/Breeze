require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
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


    module("named query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    if (!testFns.DEBUG_WEBAPI) {
        test("Skipping named query tests - not available for thru Odata", function () {
            ok(true, "Skipped tests - named queries not available in OData");
        });
        return testFns;
    };

    test("with parameter", function () {
        var em = newEm();
        var q = EntityQuery.from("CustomersStartingWith")
            .withParameters({ companyName: "C" });

        stop();
        var r, q2;
        em.executeQuery(q).then(function(data) {
            r = data.results;
            ok(r.length > 0, "should be some results");
            var allok = r.every(function(r) {
                return r.getProperty("companyName").substr(0, 1) === "C";
            });
            ok(allok, "all customers should have company names starting with 'c'");
            q2 = q.where("fax", "!=", null);
            return em.executeQuery(q2);
        }).then(function(data2) {
            var r2 = data2.results;
            ok(r2.length > 0, "should be some results again");
            ok(r2.length < r.length, "should be fewer than returned by original query");
            return em.executeQuery(q2.take(1));
        }).then(function(data3) {
            var r3 = data3.results;
            ok(r3.length === 1, "should be only a single result");
            ok(r.indexOf(r3[0]) >= 0, "should have been in the original result set");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("with two parameters", function () {
        var em = newEm();
        var q = EntityQuery.from("EmployeesFilteredByCountryAndBirthdate")
            .withParameters({ birthDate: "1/1/1960", country: "USA" });

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be some results");
            var allok = r.every(function (emp) {
                return emp.getProperty("country") == "USA";
            });
            ok(allok, "all employees should be in the US");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("with bad parameters", function () {
        var em = newEm();
        var q = EntityQuery.from("CustomersStartingWith")
            .withParameters({ foo: "C" });

        stop();
        var r, q2;
        em.executeQuery(q).then(function (data) {
            ok(false, "should not get here")
        }).fail(function(e) {
            ok(e.message.indexOf("foo") >= 0, "foo should have been in message");
        }).fin(start);
    });
    
    test("with extra parameters", function () {
        var em = newEm();
        var q = EntityQuery.from("CustomersStartingWith")
            .withParameters({ companyName: "C", extra: 123123 });

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be some results");
            var allok = r.every(function (r) {
                return r.getProperty("companyName").substr(0, 1) === "C";
            });
            ok(allok, "all customers should have company names starting with 'c'");
        }).fail(testFns.handleFail).fin(start);
    });
    
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
        }).fail(testFns.handleFail).fin(start);
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
        }).fail(testFns.handleFail).fin(start);
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
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("project enumerables with filter", function () {
        var em = newEm();
        var query = EntityQuery.from("TypeEnvelopes")
            // .where("name.length",">", 10)   // OData filtering on nested anon props seem to work
            .where("name", "startsWith", "N")
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length > 0);
            results.forEach(function(r) {
                ok(r.name.substr(0, 1) == "N");
                ok(r.namespace);
                ok(r.fullName);
            });
            
        }).fail(testFns.handleFail).fin(start);
            
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
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("project filtered collection", function () {
        var em = newEm();

        var query = EntityQuery.from("CustomersWithBigOrders")
            .where("customer.companyName", "startsWith", "A")
            .using(em);
        stop();
        query.execute().then(function (data) {
            var results = data.results;
            ok(results.length > 0);
            results.forEach(function (r) {
                ok(r.customer, "cant find customer");
                ok(r.customer.entityAspect, "customer doesn't have entityAspect");
                ok(r.bigOrders, "can't find bigOrders");
            });
        }).fail(testFns.handleFail).fin(start);
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
        }).fail(testFns.handleFail).fin(start);
    });

    
    test("server side simple filter", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersStartingWithA");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0, "should have some results");
        }).fail(testFns.handleFail).fin(start);
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
            testFns.assertIsSorted(customers, "companyName", breeze.DataType.String, false, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
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
                var o2 = em.getEntityByKey(okey);
                ok(o2 === orders[0], "order not cached");
            });
        }).fail(testFns.handleFail).fin(start);
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
            
        }).fail(testFns.handleFail).fin(start);
    });

    test("select scalar anon with two collection props", function () {

        var em = newEm();
        var query = EntityQuery
            .from("CustomersAndProducts");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
        }).fail(testFns.handleFail).fin(start);
    });
    
    return testFns;
});