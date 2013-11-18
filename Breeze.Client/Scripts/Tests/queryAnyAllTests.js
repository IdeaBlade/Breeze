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

})(breezeTestFns);