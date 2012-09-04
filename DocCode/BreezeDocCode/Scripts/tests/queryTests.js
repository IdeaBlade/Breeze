// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var entityModel = breeze.entityModel;

    var handleFail = testFns.handleFail;
    var EntityQuery = entityModel.EntityQuery;
    var verifyQuery = testFns.verifyQuery;  

    var Qop = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;
   
    var queryForOne = testFns.queryForOne;
    var queryForNone = testFns.queryForNone;
    var queryForSome = testFns.queryForSome;

    // Asserts merely to display data
    var showCustomerResults = testFns.showCustomerResultsAsAssert;

    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("queryTests (basic)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * all customers - test suite "concise" style
    * execute the query via a test helper method
    * that encapsulates the ceremony
    *********************************************************/
    test("all customers (concise)", 1, function () {

        var query = new EntityQuery("Customers");

        verifyQuery(newEm, query, "all customers");
    });

    /*********************************************************
    * all customers - promises style
    *********************************************************/
    test("all customers (promises)", 1, function () {

        var query = new EntityQuery("Customers");

        stop();                     // going async ... tell testrunner to wait
        newEm().executeQuery(query)
          .then(assertGotCustomers) // success callback
          .fail(handleFail)         // failure callback
          .fin(start);              // "fin" always called.
    });

    function assertGotCustomers(data) {
        var count = data.results.length;
        ok(count > 0, "customer query returned " + count);
    }

    /*********************************************************
    * all customers - callback style
    *********************************************************/
    test("all customers (callbacks)", 1, function () {

        var query = new EntityQuery("Customers");

        stop();                 // going async ... tell testrunner to wait
        newEm().executeQuery(query,
            function (data) {   // success callback
                assertGotCustomers(data);
                start();        // resume testrunner
            },
            handleFail        // failure callback
        );
    });


    /*** FILTERING ***/

    /*********************************************************
    * customers starting w/ 'C' (string comparison)
    *********************************************************/
    test("customers starting w/ 'C' ", 2, function () {

        // query for customer starting with 'c', sorted by name 
        var query = new EntityQuery("Customers")
            .where("CompanyName", Qop.StartsWith, "C") // or use "startsWith" 
            .orderBy("CompanyName");

        verifyQuery(newEm, query, "customers starting w/ 'C'",
            showCustomerResults);
    });

    /*********************************************************
    * customers from nowhere (testing for null)
    *********************************************************/
    test("customers from nowhere", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("Region", "==", null)
            .orderBy("CompanyName");

        verifyQuery(newEm, query, "customers with null region'",
            showCustomerResults);
    });

    /*********************************************************
    * customers from somewhere (testing for not null)
    *********************************************************/
    test("customers from somewhere", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("Region", "!=", null)
            .orderBy("CompanyName");

        verifyQuery(newEm, query, "customers with non-null region'",
            showCustomerResults);
    });

    /*********************************************************
    * customers with a name > 30 chars (compare w/ a function)
    *********************************************************/
    test("customers with long names", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("length(CompanyName)", ">", 30);

        verifyQuery(newEm, query, "customer w/ name > 30 chars'",
            showCustomerResults);
    });

    /*********************************************************
    * customer whose name contains 'market' (compare w/ nested functions)
    *********************************************************/
    test("customers whose name contains 'market'", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("indexOf(toLower(CompanyName),'market')", "ne", -1);

        verifyQuery(newEm, query, "customer query",
            showCustomerResults);
    });

    /*********************************************************
    * ok to return no results (not an error)
    *********************************************************/
    test("customers from Mars", 1, function () {

        var query = EntityQuery
            .from("Customers")
            .where("Region", "==", "Mars");

        stop(); // going async
        queryForNone(newEm, query, "customers from Mars")
        .fin(start); // resume testrunner

    });

    /*********************************************************
    * The Alfreds customer by id 
    *********************************************************/
    test("Alfreds customer by id", 2, function () {

        var query = new EntityQuery("Customers")
            .where("CustomerID", "==", testFns.wellKnownData.alfredsID);

        stop(); // going async ...
        queryForOne(newEm, query, "customer by Id") // querying ...
        .then(function (data) {   // back from query
            ok(true, "Customer name is " + data.first.CompanyName());
        })
        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * The Alfreds customer by key 
    * Let metadata say what is the EntityKey
    * Make query from the key-and-value
    *********************************************************/
    test("Alfreds customer by key", 2, function () {

        var customerType = getMetadataStore().getEntityType("Customer");

        var key = new entityModel.EntityKey(customerType, testFns.wellKnownData.alfredsID);

        var query = EntityQuery.fromEntityKey(key);

        stop(); // going async ...
        queryForOne(newEm, query, "customer by key") // querying ...
        .then(function (data) {   // back from query
            ok(true, "Customer name is " + data.first.CompanyName());
        })
        .fail(handleFail)
        .fin(start);
    });

    /*****************************************************************
    * Nancy's orders  (compare nullable int)
    ******************************************************************/
    // Note: Order.EmployeeID is nullable<int>; can still filter on it.
    test("Nancy's orders by Order.EmployeeID", 1, function () {

        var query = new EntityQuery("Orders")
           .where("EmployeeID", "==", testFns.wellKnownData.nancyID);

        verifyQuery(newEm, query, "Nancy Davolio's orders");
    });

    /*********************************************************
    * Alfreds orders (compare nullable Guid)
    *********************************************************/
    // Note: Order.CustomerID is nullable<Guid>; can still filter on it.
    test("Alfreds orders by Order.CustomerID", 1, function () {

        var query = new EntityQuery("Orders")
            .where("CustomerID", "==", testFns.wellKnownData.alfredsID);

        verifyQuery(newEm, query);
    });




    /*** NESTED QUERY ***/

    /*********************************************************
    * Orders of Customers in California
    * Customer is the related parent of Order
    * Demonstrates "nested query", filtering on a related entity
    *********************************************************/
    test("orders of Customers in California", 1, function () {

        var query = EntityQuery
            .from("Orders")
            .where("Customer.Region", "==", "CA");

        verifyQuery(newEm, query);
    });



    /*** CACHE QUERYING ***/

    /*********************************************************
    * customers starting w/ 'C' (query the cache)
    * Demonstrates that the same query works 
    * for both server and cache.
    *********************************************************/
    test("customers starting w/ 'C' (cache)", 4, function () {

        var em = newEm();

        // query for customer starting with 'c', sorted by name 
        // will be used BOTH on server AND on client
        var query = new EntityQuery("Customers")
            .where("CompanyName", "startsWith", "C")
            .orderBy("CompanyName");

        // query cache (synchronous)
        var custs = em.executeQueryLocally(query);
        var count = custs.length;
        ok(count === 0, 
            "no cached customers at all in a new EntityManager");

        stop(); // going async ...
        // query server (same query object)
        queryForSome(em, query, "Get 'C' custs from the server")

        .then(function (data) { // ... back from the server
            // query cache again (synchronous)
            custs = em.executeQueryLocally(query);
            count = custs.length;
            ok(count > 0,
                "have cached 'C' customers now; count = " + count);
            showCustomerResults({ results: custs });
        })

        .fail(handleFail)
        .fin(start);
    });


    /*** PREDICATES ***/

    module("queryTests (predicates)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * customers in London
    *********************************************************/
    test("customers in London", 2, function () {

        var pred = new Predicate("City", Qop.Equals, "London");

        var query = new EntityQuery("Customers").where(pred);

        verifyQuery(newEm, query, "customers in London",
            showCustomerResults);
    });

    /*********************************************************
    * customers in London or Paris
    *********************************************************/
    test("customers in London or Paris", 2, function () {

        var pred = new Predicate("City", Qop.Equals, "London")
                             .or("City", "==", "Paris");

        var query = new EntityQuery("Customers").where(pred);

        verifyQuery(newEm, query, "customers in London or Paris",
            showCustomerResults);
    });

    /*********************************************************
    * orders shipped in '96 with freight > 100
    * define predicates separately and combine in new predicate
    *********************************************************/
    test("orders shipped in '96 with freight > 100", 2, function () {

        // Get the predicate and show what it looks like in OData
        var pred = getOrderedIn1996Predicate();
        ok(true, "OData predicate: " + pred.toOdataFragment());

        var query = new EntityQuery("Orders").where(pred);

        verifyQuery(newEm, query, "orders query");
    });


    function getOrderedIn1996Predicate() {
        // Notice this predicate isn't associated with Order.
        // Could apply to any query on a conforming type.

        // var p1 = new Predicate("year(OrderDate)", Qop.Equals, 1996); // will work someday

        var p1 = Predicate.create(
             "OrderDate", ">=", new Date(1996, 0, 1)) // Jan=01 in JavaScript
        .and("OrderDate", "<", new Date(1997, 0, 1));

        var p2 = new Predicate("Freight", ">", 100);
        return p1.and(p2);
    }


    /*** EXPAND ***/

    module("queryTests (expand)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * Alfreds orders, expanded with their OrderDetails
    *********************************************************/
    test("Alfreds orders expanded with their OrderDetails", 3, function () {

        var query = new EntityQuery("Orders")
          .where("CustomerID", "==", testFns.wellKnownData.alfredsID)
          .expand("OrderDetails");

        var em = newEm();

        verifyQuery(em, query, "Alfred's orders expanded with their details",
                    assertGotOrderDetails);

    });

    /*********************************************************
    * Alfreds orders, including their OrderDetails, 
    * via a custom query service method, 'OrdersAndDetails'
    *********************************************************/
    test("Alfreds orders using 'OrdersAndDetails' action", 3, function () {

        // NO EXPAND NEEDED! It's added by the Web API controller action
        var query = new EntityQuery("OrdersAndDetails") // special Web API controller action
           .where("CustomerID", "==", testFns.wellKnownData.alfredsID);

        var em = newEm();

        verifyQuery(em, query, "Alfreds orders using 'OrdersAndDetails' action",
                    assertGotOrderDetails);

    });

    function assertGotOrderDetails(data) {

        var em = data.query.EntityManager; // should be "query.entityManager"; see F2026
        var odType = em.metadataStore.getEntityType("OrderDetail");

        var odsInCache = em.getEntities(odType); // all OrderDetails in cache
        var odsInCacheCount = odsInCache.length;

        ok(odsInCacheCount > 0, "should have OrderDetails in cache; got " + odsInCacheCount);

        var firstOrder = data.results[0];
        var odsByNav = firstOrder.OrderDetails(); // remember to use () ... it's a KO property

        ok(odsByNav.length > 0, "can navigate to first order's OrderDetails");

        // To manually confirm these results, run this SQL:
        // select count(*) from OrderDetail where OrderID in 
        //   (select OrderID from [Order] where CustomerID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2')
    }


    /*********************************************************
    * get OrderDetails of Alfreds 1st order 
    * via EntityQuery.fromEntityNavigation
    * Use case: 
    *   Have the order and the customer (by expand)
    *   but not the OrderDetails. Need them now, so use
    *   "fromEntityNavigation" to get them for the order
    *********************************************************/
    test("OrderDetails obtained fromEntityNavigation", 7, function () {

        var alfredsFirstOrderQuery = new EntityQuery("Orders")
          .where("CustomerID", "==", testFns.wellKnownData.alfredsID)
          .take(1)
          .expand("Customer");

        var em = newEm();
        stop();
        queryForOne(em, alfredsFirstOrderQuery, "Alfreds 1st order")
        .then(queryOrderDetailsfromEntityNavigation)
        .then(assertCanNavigateOrderOrderDetails)
        .fail(handleFail)
        .fin(start);

    });

    function queryOrderDetailsfromEntityNavigation(data) {
        var firstOrder = data.first;

        var navProp = firstOrder.entityType.getNavigationProperty("OrderDetails");

        var navQuery = EntityQuery.fromEntityNavigation(firstOrder, navProp);

        return firstOrder.entityAspect.entityManager.executeQuery(navQuery);
    }

    function assertCanNavigateOrderOrderDetails(data) {

        // Work the navigation chain from OrderDetails

        var details = data.results, count = details.length;
        ok(count, "count of OrderDetails from navigation query = " + count);

        var firstDetail = details[0];

        var order = firstDetail.Order();
        ok(order !== null, "OrderDetail.Order returns the parent Order");

        equal(order.OrderDetails().length, details.length,
            "Parent Orders's OrderDetails is same length as details retrieved by nav query");

        var customer = order.Customer();
        ok(customer !== null, "parent Order returns its parent Customer");

        ok(customer.CustomerID() === testFns.wellKnownData.alfredsID,
            "parent Customer by nav is Alfreds (in cache via initial query expand)");

        ok(firstDetail.Product() === null,
            "a detail's parent Product is not available " +
            "presumably because there are no products in cache");
    }


    /*** PROJECTION (SELECT) ***/

    module("queryTests (select)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * PROJECTION: customer names of Customers starting w/ 'C'
    * A projection of just the one property
    *********************************************************/
    test("select company names of Customers starting w/ 'C'", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("CompanyName", Qop.StartsWith, "C")
            .select("CompanyName")
            .orderBy("CompanyName");

        verifyQuery(newEm, query,
            "company names of Customers starting w/ 'C'",
            showCompanyNames);
    });

    function showCompanyNames(data) {
        var names = [];
        data.results.map(function (item) {
            names.push(item.CompanyName);
        });

        ok(true, "Names are " + names.join(", "));
    }

    /*********************************************************
    * PROJECTION: names Customers starting w/ 'C' AND their orders
    * Note that orders are in cache because they are whole entities
    * Customer names are not entities and are not in cache.
    *********************************************************/
    test("names of Customers starting w/ 'C' and their orders", 4, function () {

        var query = EntityQuery
            .from("Customers")
            .where("CompanyName", Qop.StartsWith, "C")
            .select("CompanyName, Orders")
            .orderBy("CompanyName");

        verifyQuery(newEm, query,
            "{Customer, Customer.Orders} projection",
            showCompanyNamesAndOrderCounts,
            assertOrdersInCache);
    });

    function showCompanyNamesAndOrderCounts(data) {
        var names = [];
        data.results.map(function (item) {
            names.push(item.CompanyName + "(" + item.Orders.length + ")");
        });

        ok(true, names.join(", "));
    }

    function assertOrdersInCache(data) {
        var em = data.query.EntityManager;
        var metadata = em.metadataStore;

        var customerType = metadata.getEntityType("Customer");
        var orderType = metadata.getEntityType("Order");

        var customersInCache = em.getEntities(customerType).length;
        var ordersInCache = em.getEntities(orderType).length;

        ok(customersInCache == 0,
            "shouldn't have customers in cache; count = " + customersInCache);
        ok(ordersInCache,
            "should have orders in cache; count = " + ordersInCache);
    }



    /*********************************************************
    * helpers
    *********************************************************/

    function getMetadataStore(em) {
        if (em) { return em.metadataStore; }
        // no em? no problem. We also stashed the store elsewhere
        return newEm.options.metadataStore;
    }

});