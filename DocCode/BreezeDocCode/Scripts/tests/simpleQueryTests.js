// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var entityModel = breeze.entityModel;

    var MetadataStore = entityModel.MetadataStore;
    var EntityQuery = entityModel.EntityQuery;
    var qop = entityModel.FilterQueryOp;

    var serviceName = testFns.northwindServiceName,
        metadataStore = new MetadataStore(),
        newEm = testFns.emFactory(serviceName, metadataStore);

    testFns.module("simpleQueryTests", newEm, metadataStore);

    asyncTest("get all customers", 2, function () {
        var em = newEm(),
        query = new EntityQuery("Customers");

        em.executeQuery(query)
        .then(function (data) {
            ok(data.results.length > 0, "should have customers.");
            start();
        })
        .fail(testFns.handleFail);
    });

    asyncTest("customers starting w/ 'C'", 2, function () {
        var em = newEm(),
            query = new EntityQuery()
            .from("Customers")
            .where("CompanyName", qop.StartsWith, "C") // or use "startsWith" 
            .orderBy("CompanyName");

        em.executeQuery(query)
            .then(function (data) {
                ok(data.results.length > 0, "should have customers starting w/ 'C'.");
                start();
            })
            .fail(testFns.handleFail);

    });

    // Order.CustomerID is nullable<Guid>; can still filter on it.
    asyncTest("get Alfreds orders", 2, function () {
        var em = newEm(),
            query = new EntityQuery("Orders")
                .where("CustomerID", "==", testFns.wellKnownData.alfredsID);

        em.executeQuery(query)
        .then(function (data) {
            assertGotOrders(data);
            start();
        })
        .fail(testFns.handleFail);
    });

    function assertGotOrders(data) {
        var count = data.results.length;
        ok(count > 0, "should have Orders; got " + count);
        // To manually confirm these results, run this SQL:
        // select count(*) from [Order] where CustomerID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2'
    };

    asyncTest("get Alfreds orders with their OrderDetails", 4, function () {
        var em = newEm(),
        query = new EntityQuery("Orders")
          .where("CustomerID", "==", testFns.wellKnownData.alfredsID)
          .expand("OrderDetails");

        em.executeQuery(query)
        .then(function (data) {
            assertGotOrders(data);
            assertGotOrderDetails(em);
            assertCanNavigateToFirstOrderDetails(data.results);
            start();
        })
        .fail(testFns.handleFail);

    });

    asyncTest("get Alfreds orders using 'OrdersAndDetails' action", 4, function () {
        var em = newEm(),
            query = new EntityQuery("OrdersAndDetails") // special Web API controller action
                .where("CustomerID", "==", testFns.wellKnownData.alfredsID);
        // NO EXPAND NEEDED! It's added by the Web API controller action

        em.executeQuery(query)
        .then(function (data) {
            assertGotOrders(data);
            assertGotOrderDetails(em);
            assertCanNavigateToFirstOrderDetails(data.results);
            start();
        })
        .fail(testFns.handleFail);

    });
    
    function assertGotOrderDetails(em) {
        var odType = metadataStore.getEntityType("OrderDetail"),
            count = em.getEntities(odType).length; // count of all OrderDetails in cache
        ok(count > 0, "should have OrderDetails; got " + count);
        // To manually confirm these results, run this SQL:
        // select count(*) from OrderDetail where OrderID in 
        //   (select OrderID from [Order] where CustomerID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2')
    }

    function assertCanNavigateToFirstOrderDetails(orders) {
        var first = orders[0],
            ods = first.OrderDetails(); // remember to use () ... it's a KO property
        ok(ods.length > 0, "can navigate to first order's OrderDetails");
    }

    // Order.EmployeeID is nullable<int>; can still filter on it.
    asyncTest("get Nancy Davolio orders", 2, function () {
        var em = newEm(),
        query = new EntityQuery("Orders")
        .where("EmployeeID", "==", testFns.wellKnownData.nancyID);

        em.executeQuery(query)
        .then(function (data) {
            var count = data.results.length;
            ok(count > 0, "should have Nancy Davolio Orders; got " + count);
            start();
        })
        .fail(testFns.handleFail);
    });

    asyncTest("get all employees", 2, function () {
        var em = newEm(),
        query = new EntityQuery("Employees");

        em.executeQuery(query)
            .then(function (data) {
                ok(data.results.length > 0, "should have Employees.");
                start();
            })
            .fail(testFns.handleFail);
    });

    return testFns;
});