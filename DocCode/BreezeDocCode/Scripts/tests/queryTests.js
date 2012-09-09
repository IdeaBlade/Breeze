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
    var FilterQueryOp = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;

    // We'll use this "alfred's predicate" a lot
    // e.g. to find Orders that belong to the Alfred's customer
    var alfredsPredicate =
        Predicate.create("CustomerID", "==", testFns.wellKnownData.alfredsID);
    
    var verifyQuery = testFns.verifyQuery;

    var runQuery = testFns.runQuery;
    var queryForOne = testFns.queryForOne;
    var queryForNone = testFns.queryForNone;
    var queryForSome = testFns.queryForSome;

    // Asserts merely to display data
    var showCustomerResults = testFns.showCustomerResultsAsAssert;

    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("queryTests (single condition)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * all customers - test suite "concise" style
    * execute the query via a test helper method
    * that encapsulates the ceremony
    *********************************************************/
    test("all customers (concise)", 1, function () {

        var query = EntityQuery.from("Customers"); // Create query style #1

        verifyQuery(newEm, query, "all customers");
    });

    /*********************************************************
    * all customers - promises style
    *********************************************************/
    test("all customers (promises)", 1, function () {

        var query = new EntityQuery("Customers"); // Create query style #2

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

        var query = new EntityQuery().from("Customers"); // Create query style #3

        stop();                 // going async ... tell testrunner to wait
        newEm().executeQuery(query,
            function (data) {   // success callback
                assertGotCustomers(data);
                start();        // resume testrunner
            },
            handleFail        // failure callback
        );
    });


    /*** Single condition filtering ***/

    /*********************************************************
    * customers starting w/ 'A' (string comparison)
    *********************************************************/
    test("customers starting w/ 'A' ", 2, function () {

        // query for customer starting with 'A', sorted by name 
        var query = EntityQuery.from("Customers")
            .where("CompanyName", FilterQueryOp.StartsWith, "A")
        //  .where("CompanyName", "startsWith", "A") // alternative to FilterQueryOp
        .orderBy("CompanyName");

        verifyQuery(newEm, query, "customers starting w/ 'A'",
            showCustomerResults);
    });

    /*********************************************************
    * customers starting w/ 'A' (query the cache)
    * Demonstrates that the same query works 
    * for both server and cache.
    *********************************************************/
    test("customers starting w/ 'A' (cache)", 4, function () {

        // query for customer starting with 'A', sorted by name 
        // will be used BOTH on server AND on client
        var query = new EntityQuery("Customers")
            .where("CompanyName", "startsWith", "A")
            .orderBy("CompanyName");

        // query cache (synchronous)
        var em = newEm();
        var custs = em.executeQueryLocally(query);
        var count = custs.length;
        ok(count === 0,
            "no cached customers at all in a new EntityManager");

        stop(); // going async ...
        // query server (same query object)
        queryForSome(em, query, "Get 'A' custs from the server")

        .then(function (data) { // ... back from the server
            // query cache again (synchronous)
            custs = em.executeQueryLocally(query);
            count = custs.length;
            ok(count > 0,
                "have cached 'A' customers now; count = " + count);
            showCustomerResults({ results: custs });
        })

        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * orders with freight cost over 100.
    *********************************************************/
    test("orders with freight cost over 100", 1, function () {

        var query = EntityQuery.from("Orders")
            .where("Freight", FilterQueryOp.GreaterThan, 100);
        //  .where("Freight", ">", 100); // alternative to FilterQueryOp

        verifyQuery(newEm, query, "freight orders query");
    });

    /*********************************************************
    * orders placed on or after 1/1/1998.
    *********************************************************/
    test("orders placed on or after 1/1/1998", 1, function () {

        var testDate = new Date(1998, 0, 1); // month starts at zero!

        var query = EntityQuery.from("Orders")
            .where("OrderDate", FilterQueryOp.GreaterThanOrEqual, testDate);
        //  .where("OrderDate", ">=", testDate); // alternative to FilterQueryOp

        verifyQuery(newEm, query, "date orders query");
    });

    /*********************************************************
    * orders placed on 1/1/1998.
    *********************************************************/
    test("orders placed on 1/1/1998", 1, function () {

        var testDate = new Date(1998, 0, 1); // month starts at zero!

        var query = EntityQuery.from("Orders")
            .where("OrderDate", FilterQueryOp.Equals, testDate);
        //  .where("OrderDate", "==", testDate); // alternative to FilterQueryOp

        stop();
        queryForNone(newEm, query, "date orders query")
        .fail(handleFail)
        .fin(start);
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
    * ok to return no results (not an error)
    *********************************************************/
    test("customers from Mars", 1, function () {

        var query = EntityQuery
            .from("Customers")
            .where("Region", "==", "Mars");

        stop(); // going async
        queryForNone(newEm, query, "customers from Mars")
        .fail(handleFail)
        .fin(start); // resume testrunner

    });

    /*********************************************************
    * The Alfreds customer by id 
    *********************************************************/
    test("Alfreds customer by id", 2, function () {

        var query = new EntityQuery("Customers")
            .where(alfredsPredicate);

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
            .where(alfredsPredicate);

        verifyQuery(newEm, query);
    });


    /*** Single conditions with functions ***/

    /*********************************************************
    * customers with a name > 30 chars (compare w/ an OData function)
    *********************************************************/
    test("customers with long names", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("length(CompanyName)", ">", 30);

        verifyQuery(newEm, query, "customer w/ name > 30 chars'",
            showCustomerResults);
    });

    /*********************************************************
    * customers whose 2nd and 3rd letters are "om" (compare w/ an OData function)
    *********************************************************/
    test("customers whose 2nd and 3rd letters are \"om\"", 2, function () {

        var query = EntityQuery.from("Customers")
        .where("toUpper(substring(CompanyName, 1, 2))", "==", "OM");

        verifyQuery(newEm, query, "customer substring query",
            showCustomerResults);
    });

    /*********************************************************
    * customer whose name contains 'market' (compare w/ nested OData functions)
    *********************************************************/
    test("customers whose name contains 'market'", 2, function () {

        var query = EntityQuery
            .from("Customers")
            .where("indexOf(toLower(CompanyName),'market')", "ne", -1);

        verifyQuery(newEm, query, "customer query",
            showCustomerResults);
    });


    /*** PREDICATES ***/

    module("queryTests (predicates)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * customers in London
    *********************************************************/
    test("customers in London", 2, function () {

        var pred = new Predicate("City", FilterQueryOp.Equals, "London");

        var query = new EntityQuery("Customers").where(pred);

        verifyQuery(newEm, query, "customers in London",
            showCustomerResults);
    });

    /*********************************************************
    * customers in London or Paris
    *********************************************************/
    test("customers in London OR Paris", 2, function () {

        var pred = new Predicate("City", FilterQueryOp.Equals, "London")
                             .or("City", "==", "Paris");

        var query = new EntityQuery("Customers").where(pred);

        verifyQuery(newEm, query, "customers in London or Paris",
            showCustomerResults);
    });

    /*********************************************************
    * orders ordered after April'98 AND with freight > 100
    *********************************************************/
    test("orders ordered after April '98 AND with freight > 100", 2, function () {

        var pred;
        var testDate = new Date(1998, 3, 1); // month counts from zero!
        var baseQuery = EntityQuery.from("Orders");
        var p1 = new Predicate("Freight", ">", 100);
        var p2 = new Predicate("OrderDate", ">", testDate);


        // All of these predicates are the same:
        pred = p1.and(p2);

        // pred = Predicate.and([p1, p2]);

        // pred = Predicate
        //           .create("Freight", ">", 100)
        //           .and("OrderDate", ">", testDate);


        var query = baseQuery.where(pred);

        ok(true, "OData predicate: " + pred.toOdataFragment());

        stop();

        // all should return exactly 15 orders
        runQuery(newEm, query, "AND orders query", 15)
        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * orders either ordered after April'98 OR with freight > 100
    *********************************************************/
    test("orders ordered after April '98 OR with freight > 100", 2, function () {

        var pred;
        var testDate = new Date(1998, 3, 1); // month counts from zero!
        var baseQuery = EntityQuery.from("Orders");
        var p1 = new Predicate("Freight", ">", 100);
        var p2 = new Predicate("OrderDate", ">", testDate);


        // All of these predicates are the same:
        // pred = p1.or(p2);

        pred = Predicate.or([p1, p2]);

        // pred = Predicate
        //           .create("Freight", ">", 100)
        //           .or("OrderDate", ">", testDate);


        var query = baseQuery.where(pred);

        ok(true, "OData predicate: " + pred.toOdataFragment());

        stop();

        // all should return exactly 256 orders
        runQuery(newEm, query, "OR orders query", 256)
        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * orders that do NOT have freight > 100
    *********************************************************/
    test("orders that do NOT have freight > 100", 2, function () {

        var pred;
        var baseQuery = EntityQuery.from("Orders");
        var basePred = new Predicate("Freight", ">", 100);

        // These predicates are the same:
        pred = basePred.not();
        // pred = Predicate.not(basePred);

        var query = baseQuery.where(pred);

        ok(true, "OData predicate: " + pred.toOdataFragment());

        stop();

        // all should return exactly 256 orders
        runQuery(newEm, query, "NOT orders query", 643)
        .fail(handleFail)
        .fin(start);
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

        // var p1 = new Predicate("year(OrderDate)", FilterQueryOp.Equals, 1996); // will work someday

        var p1 = Predicate.create(
             "OrderDate", ">=", new Date(1996, 0, 1)) // Jan=01 in JavaScript
        .and("OrderDate", "<", new Date(1997, 0, 1));

        var p2 = new Predicate("Freight", ">", 100);
        return p1.and(p2);
    }




    /***  RELATED PROPERTY / NESTED QUERY ***/

    module("queryTests (related property conditions)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * Orders of Customers in California
    * Customer is the related parent of Order
    * Demonstrates "nested query", filtering on a related entity
    *********************************************************/
    test("orders of Customers in California", 2, function () {

        var query = EntityQuery.from("Orders")
            .where("Customer.Region", "==", "CA")
            .expand("Customer");

        verifyQuery(newEm, query, "orders query", showOrdersToCA);
    });


    function showOrdersToCA(data) {
        if (data.results.length == 0) return;
        var ords = data.results.map(function (o) {
            return "({0}) '{1}' is in '{2}'".format(
                o.OrderID(), o.Customer().CompanyName(), o.Customer().Region());
        });
        ok(true, "Got " + ords.join(", "));
    }

    /*********************************************************
    * Products in a Category whose name begins with 'S'
    * Category is the related parent of Product
    *********************************************************/
    test("Products in categories whose names start with 'S'", 2, function () {

        var query = EntityQuery.from("Products")
            .where("Category.CategoryName", "startsWith", "S")
            .expand("Category");

        verifyQuery(newEm, query, "products query", showProductsInCategoryS);
    });

    function showProductsInCategoryS(data) {
        if (data.results.length == 0) return;
        var prods = data.results.map(function (p) {
            return "({0}) '{1}' is a '{2}'".format(
                p.ProductID(), p.ProductName(), p.Category().CategoryName());
        });
        ok(true, "Got " + prods.join(", "));
    }



    /*** EXPAND ***/

    module("queryTests (expand)", testFns.getModuleOptions(newEm));


    /*********************************************************
    * Alfreds orders, expanded with their OrderDetails
    *********************************************************/
    test("Alfreds orders expanded with their OrderDetails", 3, function () {

        var query = new EntityQuery("Orders")
          .where(alfredsPredicate)
          .expand("OrderDetails");

        var em = newEm();

        verifyQuery(em, query, "Alfred's orders expanded",
                    assertGotOrderDetails);

    });

    /*********************************************************
    * Alfreds orders, expanded with their parent Customers and
    * child OrderDetails 
    *********************************************************/
    test("Alfreds orders expanded with parent Customer and their child details ", 4,
        function () {

            var query = new EntityQuery("Orders")
              .where(alfredsPredicate)
              .expand("Customer, OrderDetails");

            var em = newEm();

            verifyQuery(em, query, "Alfred's orders expanded",
                        assertGotOrderDetails, assertGotCustomerByExpand);

        });

    /*********************************************************
    * Alfreds orders, including their OrderDetails, 
    * and the Products of those details, 
    * using property path: "OrderDetails.Product"
    *********************************************************/
    test("Alfreds orders expanded with their OrderDetails and Products", 4,
            function () {
                var query = new EntityQuery("Orders")
                  .where(alfredsPredicate)
                  .expand("OrderDetails.Product");

                var em = newEm();

                verifyQuery(em, query, "Alfred's orders expanded",
                    assertGotOrderDetails, assertGotProductByExpand);

            });


    function assertGotOrderDetails(data) {

        var em = data.query.entityManager;
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

    function assertGotCustomerByExpand(data) {
        var firstOrder = data.results[0];
        var cust = firstOrder.Customer();

        ok(cust !== null, "can navigate to first order's Customer");
    }

    function assertGotProductByExpand(data) {
        var firstOrder = data.results[0];
        var firstProduct = firstOrder.OrderDetails()[0].Product();

        ok(firstProduct !== null, "can navigate to first order's first detail's product");
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
          .where(alfredsPredicate)
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



    /*** ORDERING AND PAGING ***/

    module("queryTests (ordering & paging)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * products sorted by ProductName ascending
    *********************************************************/
    test("products sorted by name ascending ", 2, function () {

        var query = EntityQuery.from("Products")
            .expand("Category")
            .orderBy("ProductName");

        verifyQuery(newEm, query, "products query",
            showProductResults);
    });

    /*********************************************************
    * products sorted by ProductName descending
    *********************************************************/
    test("products sorted by name descending ", 2, function () {

        var query = EntityQuery.from("Products")
            .expand("Category")
        //            .orderBy("ProductName desc"); // either this way ...
            .orderByDesc("ProductName"); // ... or this way

        verifyQuery(newEm, query, "products query",
            showProductResults);
    });

    /*********************************************************
    * products sorted by price descending, then name ascending
    *********************************************************/
    test("products sorted by price descending, then name ascending ", 2, function () {

        var query = EntityQuery.from("Products")
            .expand("Category")
            .orderBy("UnitPrice desc, ProductName");

        verifyQuery(newEm, query, "products query",
            showProductResults);
        // look in results for ...
        //    (27) 'Schoggi Schokolade' at $43.9 in 'Confections', 
        //    (63) 'Vegie-spread' at $43.9 in 'Condiments',...
    });

    /*********************************************************
    * products sorted by related property (Category.CategoryName)
    *********************************************************/
    test("products sorted by related Category descending ", 2, function () {

        var query = EntityQuery.from("Products")
            .expand("Category")
            .orderBy("Category.CategoryName desc, ProductName");
        //.orderByDesc("Category.CategoryName"); // works but can only have one sort prop

        verifyQuery(newEm, query, "products query",
            showProductResults);
    });

    /*********************************************************
    * products take
    *********************************************************/
    test("first 5 products w/ take(5) ", 2, function () {

        var query = EntityQuery.from("Products")
            .orderBy("ProductName")
            .take(5)
            .expand("Category");

        verifyQuery(newEm, query, "products query",
            showProductResults);
    });

    /*********************************************************
    * products skip
    *********************************************************/
    test("skip 10 products ", 2, function () {

        var query = EntityQuery.from("Products")
            .orderBy("ProductName")
            .skip(10)
            .expand("Category");

        verifyQuery(newEm, query, "products query",
            showProductResults);
    });

    /*********************************************************
    * products paging with skip and take
    *********************************************************/
    test("paging products with skip 10, take 5", 2, function () {

        var query = EntityQuery.from("Products")
            .orderBy("ProductName")
            .skip(10)
            .take(5)
            .expand("Category");

        verifyQuery(newEm, query, "products query",
            showProductResults);
    });
    function showProductResults(data) {
        var limit = 15;
        var count = data.results.length;
        var results = (limit) ? data.results.slice(0, limit) : data.results;
        var out = results.map(function (p) {
            return "({0}) '{1}' at ${2} in '{3}'".format(
                p.ProductID(), p.ProductName(), p.UnitPrice(),
                p.Category().CategoryName());
        });
        if (count > out.length) { out.push("..."); }
        ok(true, "Got {0} products: {1}".format(count, out.join(", ")));
    }

    /*** PROJECTION (SELECT) ***/

    module("queryTests (projections with select)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * PROJECTION: customer names of Customers starting w/ 'C'
    * A projection of just the one property
    *********************************************************/
    test("select company names of Customers starting w/ 'C'", 2, function () {

        var query = EntityQuery.from("Customers")
            .where("CompanyName", FilterQueryOp.StartsWith, "C")
            .select("CompanyName")
            .orderBy("CompanyName");

        verifyQuery(newEm, query,
            "company names of Customers starting w/ 'C'",
            showCompanyNames);
    });

    function showCompanyNames(data) {
        var names = data.results.map(function (item) {
            // N.B.: the property is just a value and is NOT a KO property
            return item.CompanyName;
        });

        ok(true, "Names are " + names.join(", "));
    }

    /*********************************************************
    * PROJECTION: customer names of Orders with Freight >1000
    *********************************************************/
    test("select company names of orders with Freight > 500", 2, function () {

        var query = EntityQuery.from("Orders")
            .where("Freight", FilterQueryOp.GreaterThan, 500)
            .select("Customer.CompanyName")
            .orderBy("Customer.CompanyName");

        verifyQuery(newEm, query,
            "orders w/ big freight costs",
            showCustomer_CompanyNames); // Notice that the ".' in the path becomes "_"
    });

    function showCustomer_CompanyNames(data) {
        var names = data.results.map(function (item) {
            // Notice that the ".' in the path becomes "_"
            // N.B.: the property is just a value and is NOT a KO property
            return item.Customer_CompanyName;
        });

        ok(true, "Customer_CompanyName(s) are " + names.join(", "));
    }
    /*********************************************************
    * PROJECTION: selected properties of Customers starting w/ 'C'
    * A projection of multiple data property
    *********************************************************/
    test("project several properties of Customers starting w/ 'C'", 2, function () {

        var query = EntityQuery.from("Customers")
            .where("CompanyName", FilterQueryOp.StartsWith, "C")
        //.select("CustomerID_OLD", "CompanyName", "ContactName" ) // future alternate syntax?
            .select("CustomerID_OLD, CompanyName, ContactName")
            .orderBy("CompanyName");

        verifyQuery(newEm, query,
            "projection of Customers starting w/ 'C'",
            showProjectedCustomer);
    });

    function showProjectedCustomer(data) {
        var projection = data.results.map(function (item) {
            return "[({0}) '{1}' - '{2}']".format(
            // N.B.: the property are just plain values and are NOT KO properties
                item.CustomerID_OLD, item.CompanyName, item.ContactName);
        });

        ok(true, "Projected customers are " + projection.join(", "));
    }

    /*********************************************************
    * PROJECTION: orders of Customers starting w/ 'C'
    * A projection of just the one navigation property
    *********************************************************/
    test("select orders of Customers starting w/ 'C'", 3, function () {

        var query = EntityQuery.from("Customers")
            .where("CompanyName", FilterQueryOp.StartsWith, "C")
            .select("Orders");

        verifyQuery(newEm, query,
            "orders of Customers starting w/ 'C'",
            assertCustomersNotInCache,
            assertOrdersInCache);
    });

    /*********************************************************
    * PROJECTION: names Customers starting w/ 'C' AND their orders
    * Note that orders are in cache because they are whole entities
    * Customer names are not entities and are not in cache.
    *********************************************************/
    test("names of Customers starting w/ 'C' and their orders", 4, function () {

        var query = EntityQuery.from("Customers")
            .where("CompanyName", FilterQueryOp.StartsWith, "C")
            .select("CompanyName, Orders")
            .orderBy("CompanyName");

        verifyQuery(newEm, query,
            "{Customer, Customer.Orders} projection",
            showCompanyNamesAndOrderCounts,
            assertCustomersNotInCache,
            assertOrdersInCache);
    });

    function showCompanyNamesAndOrderCounts(data) {
        var names = data.results.map(function (item) {
            return "{0} ({1})".format(item.CompanyName, item.Orders.length);
        });

        ok(true, names.join(", "));
    }

    function assertCustomersNotInCache(data) {
        var em = data.query.entityManager;
        var metadata = em.metadataStore;

        var customerType = metadata.getEntityType("Customer");
        var customersInCache = em.getEntities(customerType).length;

        ok(customersInCache == 0,
            "shouldn't have customers in cache; count = " + customersInCache);
    }

    function assertOrdersInCache(data) {
        var em = data.query.entityManager;
        var metadata = em.metadataStore;

        var orderType = metadata.getEntityType("Order");
        var ordersInCache = em.getEntities(orderType).length;

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