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

    test("query any and gt", function () {
        var manager = newEm();
        var query = EntityQuery.from("Employees")
           .where("orders", "any", "freight",  ">", 950);
        stop();
        manager.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with orders with freight > 950");
        }).fail(testFns.handleFail).fin(start);

    });

    test("query any and gt with expand", function () {
        var manager = newEm();
        var query = EntityQuery.from("Employees")
           .where("orders", "any", "freight", ">", 950)
           .expand("orders");
        stop();
        manager.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length === 2, "should be only 2 emps with orders with freight > 950");
            emps.forEach(function (emp) {
                var orders = emp.getProperty("orders");
                var isOk = orders.some(function (order) {
                    return order.getProperty("freight") > 950;
                });
                ok(isOk, "should be some order with freight > 950");
            });
        }).fail(testFns.handleFail).fin(start);

    });

    test("query any with composite predicate and expand", function () {
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
        }).fail(testFns.handleFail).fin(start);

    });

    test("query with two any and expand", function () {
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
        }).fail(testFns.handleFail).fin(start);

    });

    test("query with nested any", function () {
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
        
        }).fail(testFns.handleFail).fin(start);

    });

    // Need
    // 
    // toString tests
    // bad any all tests
    // composite any tests
    // local query tests

})(breezeTestFns);