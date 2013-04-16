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
    
    module("local query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    test("query property inference error", function () {
        var em = newEm();
        var q1 = EntityQuery.from("Orders")
            .where("orderID", "==", "20140000");
        var r1 = em.executeQueryLocally(q1);
        ok(r1.length == 0);

        var p1 = new Predicate("orderID", "==", "2140000");
        var q2 = EntityQuery.from("Orders").where(p1);
        var r2 = em.executeQueryLocally(q2);
        ok(r2.length == 0);

        var p2 = new Predicate("employeeID", "ne", "orderID");
        var q3 = EntityQuery.from("Orders").where(p1.and(p2));
        var r3 = em.executeQueryLocally(q3);
        ok(r3.length == 0);
    });

    
    test("empty em", function () {
        var em = new EntityManager();
        var q = EntityQuery.from("Orders")
            .where("shippedDate", "==", null)
            .take(20);
        try {
            var r = em.executeQueryLocally(q);
            ok(false, "should not get here");
        } catch (e) {
            ok(e.message.indexOf("metadata") > 0, "error message should mention metadata");
            var x = e;
        }
        
    });
    
    test("null dates", function () {
        var em = newEm();
        var q = EntityQuery.from("Orders")
            .where("shippedDate", "==", null)
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be at least 1 null date");
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("timespan", function () {
        var em = newEm();
        var q = EntityQuery.from("TimeLimits")
            .where("maxTime", "<", "PT4H")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("compare timespans", function () {
        var em = newEm();
        var q = EntityQuery.from("TimeLimits")
            .where("maxTime", "<", "minTime")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("null timespans", function () {
        var em = newEm();
        var q = EntityQuery.from("TimeLimits")
            .where("minTime", "!=", null)
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("compare dates", function () {
        var em = newEm();
        var q = EntityQuery.from("Orders")
            .where("requiredDate", "<", "shippedDate")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("local query with two fields & contains", function () {
        var em = newEm();
        var q = EntityQuery.from("Employees")
            .where("lastName", "startsWith", "firstName")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("local query with two fields & contains literal", function () {
        var em = newEm();
        var q = EntityQuery.from("Employees")
            .where("lastName", "startsWith", "test")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });

    test("local query with two fields & contains literal forced", function () {
        var em = newEm();
        var q = EntityQuery.from("Employees")
            .where("lastName", "startsWith", "firstName", true)
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var r2 = em.executeQueryLocally(q);
            ok(r.length == r2.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("local query with select", function () {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", "startswith", "c");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have returned some entities");
            var q2 = new EntityQuery()
                  .from("Customers")
                  .where("companyName", "startsWith", "C")
                  .select("companyName");            
            var r2 = em.executeQueryLocally(q2);
            
            ok(r.length === r2.length, "should have returned the same number of results");
            ok(r2[0].entityAspect === undefined, "local query projected results should not be entities");
            ok(r2[0].companyName != null);

        }).fail(testFns.handleFail).fin(start);
    });
    
    test("local query with complex select", function () {
        var em = newEm();

        var query = EntityQuery
            .from("Orders")
            .where("customer.companyName", "startsWith", "C")
            .orderBy("customer.companyName")
            .expand("customer");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have returned some entities");
            var q2 = query.select("customer.companyName, customer, orderDate");
            var r2 = em.executeQueryLocally(q2);

            ok(r.length === r2.length, "should have returned the same number of results");
            var rx = r2[0];
            ok(rx.entityAspect === undefined, "local query projected results should not be entities");
            ok(rx["customer_companyName"] != null, "customer company name should not be null");
            ok(rx["customer"].entityAspect != null, "customer property should be an entity");
            ok(rx["orderDate"] != null, "orderDate should not be null");

        }).fail(testFns.handleFail).fin(start);
    });


    
    
    test("local query does not return added entity after rejectChanges", 2, function () {
        var em = newEm();

        var typeInfo = em.metadataStore.getEntityType("Order");
        var newEntity = typeInfo.createEntity();
        em.addEntity(newEntity);

        newEntity.entityAspect.rejectChanges();
        var entityState = newEntity.entityAspect.entityState;
        ok(entityState.isDetached(),
            "state of newEntity, after rejectChanges should be Detached; is " + entityState);

        // FAILS with "TypeError: Unable to get property 'entityAspect' of undefined or null reference"
        var orders = em.executeQueryLocally(breeze.EntityQuery.from("Orders"));
        ok(orders.length === 0,
            "Local query should return no orders");
    });


    test("numeric/string local query ", function () {
        var em = newEm();
        stop();
        EntityQuery.from("Products").take(5).using(em).execute().then(function (data) {
            var id = data.results[0].getProperty("productID").toString();
            var query = new breeze.EntityQuery()
                .from("Products").where('productID', '==', id);
            var r = em.executeQueryLocally(query);
            
            ok(r.length == 1);
            query = new breeze.EntityQuery()
                .from("Products").where('productID', '!=', id);
            r = em.executeQueryLocally(query);
            ok(r.length == 4);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - startsWith", function() {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", "startswith", "c");
        stop();
        em.executeQuery(query).then(function(data) {
            var r = data.results;
            ok(r.length > 0, "should have returned some entities");
            var r2 = em.executeQueryLocally(query);
            ok(r.length === r2.length, "should have returned the same number of entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - endsWith", function () {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", "endsWith", "OS");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have returned some entities");
            var r2 = em.executeQueryLocally(query);
            ok(r.length === r2.length, "should have returned the same number of entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - contains", function () {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", "contains", "SP");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have returned some entities");
            var r2 = em.executeQueryLocally(query);
            ok(r.length === r2.length, "should have returned the same number of entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - order by", function () {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "F")
            .orderBy("companyName");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            var comps1 = r.map(function(e) { return e.getProperty("companyName"); });
            ok(r.length > 0, "should have returned some entities");
            var r2 = em.executeQueryLocally(query);
            var comps2 = r2.map(function(e) { return e.getProperty("companyName") });
            ok(r.length === r2.length, "should have returned some entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - order by", function () {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "F")
            .orderBy("companyName");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            var comps1 = r.map(function (e) { return e.getProperty("companyName"); });
            ok(r.length > 0, "should have returned some entities");
            var r2 = em.executeQueryLocally(query);
            var comps2 = r2.map(function (e) { return e.getProperty("companyName") });
            ok(r.length === r2.length, "should have returned some entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - order by 2", function () {
        var em = newEm();
        var baseQuery = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "F");
        stop();
        em.executeQuery(baseQuery).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var query = baseQuery.orderBy("companyName");
            var r2 = em.executeQueryLocally(query);
            var names = r2.map(function (e) {
                return e.getProperty("companyName");
            });
            testFns.assertIsSorted(r2, "companyName", breeze.DataType.String, false, false);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - order by 3", function () {
        var em = newEm();
        var baseQuery = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "F");
        stop();
        em.executeQuery(baseQuery).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var query = baseQuery.orderBy("city");
            var r2 = em.executeQueryLocally(query);
            var names = r2.map(function (e) {
                return e.getProperty("city");
            });
            testFns.assertIsSorted(r2, "city", breeze.DataType.String, false, false);
        }).fail(testFns.handleFail).fin(start);
    });
    

    test("case sensitivity - order by desc", function () {
        var em = newEm();
        var baseQuery = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "F");
        stop();
        em.executeQuery(baseQuery).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var query = baseQuery.orderBy("companyName desc");
            var r2 = em.executeQueryLocally(query);
            var names = r2.map(function(e) {
                return e.getProperty("companyName");
            });
            testFns.assertIsSorted(r2, "companyName", breeze.DataType.String, true, false);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - order by multiple props", function () {
        var em = newEm();
        var baseQuery = EntityQuery.from("Customers")
            .where("city", "startsWith", "B");
        stop();
        em.executeQuery(baseQuery).then(function (data) {
            var r = data.results;
            ok(r.length > 0);

            var query = baseQuery.orderBy("city, companyName");

            var r2 = em.executeQueryLocally(query);
            var names = r2.map(function (e) {
                return e.getProperty("city");
            });
            testFns.assertIsSorted(r2, "city", breeze.DataType.String, false, false);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - order by multiple props desc", function () {
        var em = newEm();
        var baseQuery = EntityQuery.from("Customers")
            .where("city", "startsWith", "B");
        stop();
        em.executeQuery(baseQuery).then(function (data) {
            var r = data.results;
            ok(r.length > 0);

            var query = baseQuery.orderBy("city desc, companyName desc");

            var r2 = em.executeQueryLocally(query);
            var names = r2.map(function (e) {
                return e.getProperty("city");
            });
            testFns.assertIsSorted(r2, "city", breeze.DataType.String, true, false);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query for null values", function () {
        var em = newEm();
        var baseQuery = EntityQuery.from("Customers")
            .where("city", "!=", null);
        stop();
        em.executeQuery(baseQuery).then(function (data) {
            var r = data.results;
            ok(r.length > 0);

            var query = baseQuery.orderBy("city");

            var r2 = em.executeQueryLocally(query);
            var names = r2.map(function (e) {
                return e.getProperty("city");
            });
            testFns.assertIsSorted(r2, "city", breeze.DataType.String, false, false);
        }).fail(testFns.handleFail).fin(start);
    });

        
    test("case sensitivity - string padding", function () {
        var em = newEm();
        var origCompName = "Simons bistro";
        var q1 = EntityQuery.from("Customers")
            .where("companyName", "startsWith", origCompName);
        var q2 = EntityQuery.from("Customers")
               .where("companyName", "==", origCompName);
        stop();
        var saved = false;
        em.executeQuery(q1).then(function (data) {
            var r = data.results;
            ok(r.length === 1);
            var compNm = r[0].getProperty("companyName");
            var ending = compNm.substr(compNm.length - 2);
            if (ending !== "  ") {
                r[0].setProperty("companyName", origCompName + "  ");
                saved = true;
            }
            return em.saveChanges();
        }).then(function (sr) {
            if (saved) {
                ok(sr.entities.length === 1);
            } 
            return em.executeQuery(q2);
        }).then(function (data2) {
            var r = data2.results;
            ok(r.length === 1, "should have returned 1 entity");
            var r2 = em.executeQueryLocally(q2);
            ok(r.length === r2.length, "should have returned the same entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("case sensitivity - string padding 2", function () {
        var em = newEm();
        var origCompName = "Simons bistro";
        var q = EntityQuery.from("Customers")
               .where("companyName", "!=", origCompName);
        stop();
        var saved = false;
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 1, "should have returned more than 1 entity");
            var r2 = em.executeQueryLocally(q);
            ok(r.length === r2.length, "should have returned the same entities");
            ok(core.arrayEquals(r, r2), "arrays should be equal");
        }).fail(testFns.handleFail).fin(start);
    });

      
    test("executeQueryLocally for related entities after query", function () {
        var em = newEm();
        var query = breeze.EntityQuery.from("Orders").take(10);
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
        }).fail(testFns.handleFail).fin(start);

    });

    test("local query", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("freight", ">=", 500);

        stop();
        em.executeQuery(query, function(data) {
            var orders = data.results;
            var ordersL = em.executeQueryLocally(query);
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            var orders2 = em.executeQueryLocally(query2);
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function(o) { return o.getProperty("freight") >= 500; }));
            
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("local query - fetchStrategy", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("freight", ">=", 500);

        var orders;
        stop();
        em.executeQuery(query).then(function(data) {
            orders = data.results;
            query = query.using(FetchStrategy.FromLocalCache);
            return em.executeQuery(query);
        }).then(function(dataLocal) {
            var ordersL = dataLocal.results;
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            em.defaultQueryOptions = new QueryOptions({ fetchStrategy: FetchStrategy.FromLocalCache });
            return em.executeQuery(query2);
        }).then(function(data2) {
            var orders2 = data2.results;
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function(o) { return o.getProperty("freight") >= 500; }));
        }).fail(testFns.handleFail).fin(start);
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
            return query.using(breeze.FetchStrategy.FromLocalCache).execute();
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

