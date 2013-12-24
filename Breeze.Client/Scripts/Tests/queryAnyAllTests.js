(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    var EntityQuery = breeze.EntityQuery;
    var DataService = breeze.DataService;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

    var newEm = testFns.newEm;
    var wellKnownData = testFns.wellKnownData;

    module("query any/all", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    test("any and gt", function () {
        var em = newEm();
        var query = EntityQuery.from("Employees")
           .where("orders", "any", "freight",  ">", 950);
        stop();
        em.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with orders with freight > 950");
        }).fail(testFns.handleFail).fin(start);

    });

    test("any and gt (local)", function () {
        var em = newEm();
        var query = EntityQuery.from("Employees")
           .where("orders", "any", "freight", ">", 950)
           .expand("orders");
        stop();
        em.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with orders with freight > 950");
            var emps2 = em.executeQueryLocally(query);

            var isOk = testFns.haveSameContents(emps, emps2);
            ok(isOk, "arrays should have the same contents");
        }).fail(testFns.handleFail).fin(start);

    });
    

    test("all with composite predicates ", function () {
        var em = newEm();
        var p2 = Predicate.create("freight", ">", 10);
        var p1 = Predicate.create("orders", "all", p2);
        var p0 = Predicate.create("companyName", "contains", "ar").and(p1);
        
        var query = EntityQuery.from("Customers").where(p0).expand("orders");
           
        stop();
        em.executeQuery(query).then(function (data) {
            var custs = data.results;
            custs.forEach(function (cust) {
                ok(cust.getProperty("companyName").indexOf("ar") >= 0, "custName should contain 'ar'");
                var orders = cust.getProperty("orders");
                var isOk = orders.every(function (o) {
                    return o.getProperty("freight") > 10;
                });
                ok(isOk, "every order should have a freight value > 10");
            })

            var custs2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(custs, custs2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("any with not", function () {
        var em = newEm();
        // customers with no orders
        var p = Predicate.create("orders", "any", "rowVersion", ">=", 0).not();
        var query = EntityQuery.from("Customers").where(p).expand("orders");

        stop();
        em.executeQuery(query).then(function (data) {
            var custs = data.results;
            custs.forEach(function (cust) {
                var orders = cust.getProperty("orders");
                ok(orders.length === 0, "every orders collection should be empty");
            })

            var custs2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(custs, custs2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("any with != null", function () {
        var em = newEm();
        // customers with no orders
        var p = Predicate.create("orders", "any", "rowVersion", "!=", null).not();
        var query = EntityQuery.from("Customers").where(p).expand("orders");

        stop();
        em.executeQuery(query).then(function (data) {
            var custs = data.results;
            custs.forEach(function (cust) {
                var orders = cust.getProperty("orders");
                ok(orders.length === 0, "every orders collection should be empty");
            })

            var custs2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(custs, custs2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("any and gt with expand", function () {
        var em = newEm();
        var query = EntityQuery.from("Employees")
           .where("orders", "any", "freight", ">", 950)
           .expand("orders");
        stop();
        em.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with orders with freight > 950");
            emps.forEach(function (emp) {
                var orders = emp.getProperty("orders");
                var isOk = orders.some(function (order) {
                    return order.getProperty("freight") > 950;
                });
                ok(isOk, "should be some order with freight > 950");
            });

            var emps2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(emps, emps2);
            ok(isOk, "arrays should have the same contents");
        }).fail(testFns.handleFail).fin(start);

    });

    test("any and nested property", function () {
        var em = newEm();
        var query = EntityQuery.from("Employees")
           .where("orders", "any", "customer.companyName", "startsWith", "Lazy")
           .expand("orders.customer");
        stop();
        em.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with orders with companys named 'Lazy...' ");
            emps.forEach(function (emp) {
                var orders = emp.getProperty("orders");
                var isOk = orders.some(function (order) {
                    var cust = order.getProperty("customer");
                    return cust.getProperty("companyName").indexOf("Lazy") >= 0;
                });
                ok(isOk, "should be some order with the right company name");
            });

            var emps2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(emps, emps2);
            ok(isOk, "arrays should have the same contents");
        }).fail(testFns.handleFail).fin(start);

    });

    test("any with composite predicate and expand", function () {
        var em = newEm();
        var p = Predicate.create("freight", ">", 950).and("shipCountry", "startsWith", "G");
        var query = EntityQuery.from("Employees")
           .where("orders", "any", p)
           .expand("orders");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 1, "should be only 1 emps with orders (with freight > 950 and shipCountry starting with 'G')");
            emps.forEach(function (emp) {
                var orders = emp.getProperty("orders");
                var isOk = orders.some(function (order) {
                    return order.getProperty("freight") > 950 && order.getProperty("shipCountry").indexOf("G") === 0;
                });
                ok(isOk, "should be some order with freight > 950");
            });

            var emps2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(emps, emps2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("two anys and an expand", function () {
        // different query than one above.
        var em = newEm();
        var p = Predicate.create("orders", "any", "freight", ">", 950)
            .and("orders", "any", "shipCountry", "startsWith", "G");
        var query = EntityQuery.from("Employees")
           .where(p)
           .expand("orders");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with (orders with freight > 950) and (orders with shipCountry starting with 'G'");
            emps.forEach(function (emp) {
                var orders = emp.getProperty("orders");
                var isOk = orders.some(function (order) {
                    return order.getProperty("freight") > 950;
                });
                ok(isOk, "should be some order with freight > 950");
                var isOk = orders.some(function (order) {
                    return order.getProperty("shipCountry").indexOf("G") === 0;
                });
                ok(isOk, "should be some order with shipCountry starting with 'G'");
            });

            var emps2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(emps, emps2);
            ok(isOk, "arrays should have the same contents");
        }).fail(testFns.handleFail).fin(start);

    });

    test("nested any", function () {
        // different query than one above.
        var em = newEm();
        var q1 = EntityQuery.from("Customers")
           .where("orders", "any", "orderDetails", "some", "unitPrice", ">", 200);

        var p2 = new Predicate("unitPrice", ">", 200).and("quantity", ">", 50);
        var q2 = EntityQuery.from("Customers")
           .where("orders", "some", "orderDetails", "any", p2)
           .expand("orders.orderDetails");

        var queryUrl = q2._toUri(em.metadataStore);
        stop();
        var custs, l0;
        em.executeQuery(q1).then(function (data) {
            custs = data.results;
            l0 = custs.length;
            ok(l0 > 10);
            return em.executeQuery(q2);
        }).then(function(data2) {
            custs = data2.results;
            l2 = custs.length;
            ok(l2 < l0, "2nd query should return fewer records.");

            var custs2 = em.executeQueryLocally(q2);
            var isOk = testFns.haveSameContents(custs, custs2);
            ok(isOk, "arrays should have the same contents");
        
        }).fail(testFns.handleFail).fin(start);

    });

    test("nested any predicate toString", function () {
        var em = newEm()
        var p2 = new Predicate("unitPrice", ">", 200).and("quantity", ">", 50);
        var p1 = new Predicate("orders", "some", "orderDetails", "any", p2);
       
        var q2 = EntityQuery.from("Customers")
           .where("orders", "some", "orderDetails", "any", p2)
           .expand("orders.orderDetails");
        
        var queryUrl = q2._toUri(em.metadataStore);
        var s = q2.wherePredicate.toString();
        
        ok(s.length > 0);
    });

    test("nested any error", function () {
        var em = newEm()
        var p2 = new Predicate("unitPrice", ">", 200).and("XXquantity", ">", 50);
        
        var q2 = EntityQuery.from("Customers")
           .where("orders", "some", "orderDetails", "any", p2)
           .expand("orders.orderDetails");

        try {
            var queryUrl = q2._toUri(em.metadataStore);
            ok(false, "should not get here")
        } catch (e) {
            ok(e.message.indexOf("XXquantity") >= 0, "error should be about 'XXquantity'");
        }

    });



})(breezeTestFns);