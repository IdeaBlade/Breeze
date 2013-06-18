// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var handleFail = testFns.handleFail;
    var EntityQuery = breeze.EntityQuery;
    var EntityType = breeze.EntityType;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;

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

    /*********************************************************
    * Custom timeout cancels 'all customers' query
    * The server may or maynot complete the query but the
    * query has timedout from the client perspective.
    *********************************************************/
    test("custom timeout cancels 'all customers' query", 1,
        function () {
            var timeoutMs = 1; // ridiculously short ... should time out
            allCustomerTimeoutQuery(timeoutMs, true);
        });
    /*********************************************************
   * 'all customers' query completes before custom timeout
   *********************************************************/
    test("'all customers' query completes before custom timeout", 1,
        function () {
            var timeoutMs = 100000; // ridiculously long ... should succeed
            allCustomerTimeoutQuery(timeoutMs, false);
        });
    function allCustomerTimeoutQuery (timeoutMs, shouldTimeout) {

        var expectTimeoutMsg = shouldTimeout ?
            " when should timeout." : " when should not timeout.";
        
        var em = newEm();
        var query = new EntityQuery().from("Customers").using(em); 

        stop(); // going async ... tell testrunner to wait

        Q.timeout(query.execute(), timeoutMs)
            .then(queryFinishedBeforeTimeout)
            .fail(queryTimedout)
            .fin(start);
        
        function queryFinishedBeforeTimeout(data) {
            var count = data.results.length;
            ok(!shouldTimeout,
                "Query succeeded and got {0} records; {1}.".
                format(count, expectTimeoutMsg));
        }

        function queryTimedout(error) {
            var expect = /timed out/i;
            var emsg = error.message;
            if (expect.test(emsg)) {
                ok(shouldTimeout, 
                    ("Query timed out w/ message '{0}' " + expectTimeoutMsg)
                    .format(emsg));
            } else {
                handleFail(error);
            }
        }
    }
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

        var em = newEm();
        var customerType =
            em.metadataStore.getEntityType("Customer");

        var key = new breeze.EntityKey(customerType, testFns.wellKnownData.alfredsID);

        var query = EntityQuery.fromEntityKey(key);

        stop(); // going async ...
        queryForOne(em, query, "customer by key") // querying ...
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

        var query = EntityQuery.from("Customers")
            .where("CompanyName", FilterQueryOp.Contains, 'market');           
        //.where("CompanyName", "contains", 'market'); // Alternative to FilterQueryOp
        //.where("substringof(CompanyName,'market')", "eq", true); // becomes in OData
        //.where("indexOf(toLower(CompanyName),'market')", "ne", -1); // equivalent to

        verifyQuery(newEm, query, "customer query",
            showCustomerResults);
    });


    /*********************************************************
    * Query using withParameters
    *********************************************************/
    asyncTest("can query 'withParameters'", 2, function () {

        var em = newEm();
        var query = EntityQuery.from("CustomersStartingWith")
            .withParameters({ companyName: "qu"});

        em.executeQuery(query).then(success).fail(handleFail).fin(start);

        function success(data) {
            var results = data.results, len = results.length;
            ok(len, "should have customers; got " + len);
            var qu = 0;
            results.forEach(function (c) { qu += /qu.*/i.test(c.CompanyName()); });
            ok(len === qu, "all of them should begin 'Qu'");
        }
    });
    /*********************************************************
    * Combination of IQueryable and withParameters
    *********************************************************/
    asyncTest("can query combining 'withParameters' and filter", 3, function () {

        var em = newEm();
        var query = EntityQuery.from("CustomersStartingWith")
            .where('Country', 'eq', 'Brazil')
            .withParameters({ companyName: "qu" });

        em.executeQuery(query).then(success).fail(handleFail).fin(start);

        function success(data) {
            var results = data.results, len = results.length;
            ok(len, "should have customers; got " + len);
            var qu = 0;
            results.forEach(function (c) { qu += /qu.*/i.test(c.CompanyName()); });
            ok(len === qu, "all of them should begin 'Qu'");
            var brazil = 0;
            results.forEach(function (c) { brazil += c.Country() === "Brazil"; });
            ok(len === brazil, "all of them should be in Brazil");
        }
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
        var em = newEm();
        var nullEntityType = new EntityType(em.metadataStore);
        ok(true, "OData predicate: " + pred.toOdataFragment(nullEntityType));

        stop();

        // all should return exactly 15 orders
        runQuery(em, query, "AND orders query", 15)
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
        var em = newEm();
        var nullEntityType = new EntityType(em.metadataStore);
        ok(true, "OData predicate: " + pred.toOdataFragment(nullEntityType));

        stop();

        // all should return exactly 256 orders
        runQuery(em, query, "OR orders query", 256)
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
        var em = newEm();
        var nullEntityType = new EntityType(em.metadataStore);
        ok(true, "OData predicate: " + pred.toOdataFragment(nullEntityType));

        stop();

        // all should return exactly 256 orders
        runQuery(em, query, "NOT orders query", 643)
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
        var em = newEm();
        var nullEntityType = new EntityType(em.metadataStore);
        ok(true, "OData predicate: " + pred.toOdataFragment(nullEntityType));

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
    
    /*********************************************************
     * Orders with an OrderDetail for a specific product
     * Demonstrates "nested query" filtering on a collection navigation
     * You can't really do this clientside. 
     * But you can call a controller method to do it
     *********************************************************/
    test("orders for Chai", 2, function () {

        var manager = newEm();
        var chaiProductID = testFns.wellKnownData.chaiProductID;

        var query = EntityQuery.from("OrdersForProduct/?productID=" + chaiProductID);
        // query = query.expand("Customer, OrderDetails");

        stop();
        manager.executeQuery(query)
            .then(showChaiOrders)
            .fail(handleFail)
            .fin(start);
        
        function showChaiOrders(data) {
            ok(data.results.length, "should have orders");
            var prods = data.results.map(function (o) {
                var customer = o.Customer();
                
                var customerName = customer ? customer.CompanyName() : "<unknown customer>";
                
                var chaiItems = o.OrderDetails().filter(
                    function (od) { return od.ProductID() === chaiProductID; });
                
                var quantity = (chaiItems.length) ? chaiItems[0].Quantity() : "some";
                
                return "({0}) '{1}' ordered {2} boxes of Chai".format(
                    o.OrderID(), customerName, quantity);
            });
            ok(true, "Got " + prods.join(", "));
        }
    });

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
    /*********************************************************
    * inlineCount of paged products
    *********************************************************/
    test("inlineCount of paged products", 2, function () {
        
        // Filtered query
        var productQuery = EntityQuery.from("Products")
            .where("ProductName", "startsWith", "C");
        
        // Paging of that filtered query ... with inlineCount
        var pagedQuery = productQuery
            .orderBy("ProductName")
            .skip(5)
            .take(5)
            .inlineCount();
     
        var productCount, pagedCount, inlineCount;
        var em = newEm();
        stop(); // going async
        
        // run both queries in parallel
        var promiseProduct =
            em.executeQuery(productQuery)
                .then(function(data) {
                     productCount = data.results.length;
                });

        var promisePaged =
            em.executeQuery(pagedQuery)
                .then(function (data) {
                    pagedCount = data.results.length;
                    inlineCount = data.inlineCount;
                });
        
        Q.all([promiseProduct, promisePaged])
            .then(function() {
                ok(inlineCount,
                    "'data' from paged query should have 'inlineCount'");
                equal(inlineCount, productCount,
                    "'inlineCount' should equal product count");
            })
            .fail(handleFail)
            .fin(start);
    });
    /*** PROJECTION ***/

    module("queryTests (projections)", testFns.getModuleOptions(newEm));

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
    * PROJECTION: customer names of Orders with Freight >500
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
        //.select("CustomerID", "CompanyName", "ContactName" ) // future alternate syntax?
            .select("CustomerID, CompanyName, ContactName")
            .orderBy("CompanyName");

        verifyQuery(newEm, query,
            "projection of Customers starting w/ 'C'",
            showProjectedCustomer);
    });

    function showProjectedCustomer(data) {

        var projection = data.results.map(function (item) {
            return "[({0}) '{1}' - '{2}']".format(
            // N.B.: the property are just plain values and are NOT KO properties
                item.CustomerID, item.CompanyName, item.ContactName);
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
    * PROJECTION: Lookups - a query returing an array of entity lists
    *********************************************************/
    test("query a lookup array of entity lists", 5, function () {

        var em = newEm();
        stop(); // going async .. 
        EntityQuery.from('LookupsArray')
            .using(em).execute()
            .then(querySucceeded)      
            .fail(handleFail)
            .fin(start);
        
        function querySucceeded(data) {
            var lookups = data.results;
            ok(lookups.length === 3, "should have 3 lookup items");
            // each one looks like an array but is actually
            // an object whose properties are '0', '1', '2', etc.
            // would use for..in to iterate over it.
            var regions = lookups[0];
            ok(regions[0], "should have a region");
            var territories = lookups[1];
            ok(territories[0], "should have a territory");
            var categories = lookups[0];
            ok(categories[0], "should have a category");
            equal(categories[0].entityAspect.entityState.name,
                breeze.EntityState.Unchanged.name,
                "first category should be unchanged entity in cache");
        }
    });

    /*********************************************************
    * PROJECTION: Lookups - a query returing an anonymous object
    * whose properties are entity lists
    *********************************************************/
    test("query a lookup object w/ entity list properties", 5, function () {

        var em = newEm();
        stop(); // going async .. 
        EntityQuery.from('Lookups')
            .using(em).execute()
            .then(querySucceeded)
            .fail(handleFail)
            .fin(start);

        function querySucceeded(data) {
            ok(data.results.length, "should have query results");
            var lookups = data.results[0];
            ok(lookups.regions.length, "should have lookups.regions");
            ok(lookups.territories.length, "should have lookups.territories");
            ok(lookups.categories.length, "should have lookups.categories");
            equal(lookups.categories[0].entityAspect.entityState.name,
                breeze.EntityState.Unchanged.name,
                "first lookups.category should be unchanged entity in cache");
        }
    });
    
    /*********************************************************
    * PROJECTION: Populate a combobox with a list from a lookup
    * Also demonstrates QUnit testing of Knockout binding
    *********************************************************/
    test("Can populate a combobox with a list from a lookup", 1, function () {
        var view = setupCombobox();
        var vm = getComboboxTestVm();
        ko.applyBindings(vm, view);
        
        var em = newEm();
        stop(); // going async .. 
        EntityQuery.from('Lookups')
            .using(em).execute()
            .then(querySucceeded)
            .fail(handleFail)
            .fin(start);

        function querySucceeded(data) {
            var lookups = data.results[0];
            var categories = lookups.categories;
            vm.categories(categories);
            vm.item().Category(categories[1]);
            var expectedText = categories[1].CategoryName();
            var selectedText = $("select option:selected", view)[0].text;
            equal(selectedText, expectedText,
                "Should have bound to combobox and selected option should be " + expectedText);
        }
        
        function setupCombobox() {
            var fixtureNode = $('#qunit-fixture').append(
                '<div id="vm" data-bind="with: item"> '+
                    '<label>Categories</label>' +
                    '<select id="categoryCombo" ' +
                        'data-bind="options: $parent.categories, ' +
                        'optionsText: \'CategoryName\', value: Category">' +
                    '</select></div>').get(0);
            return $("#vm", fixtureNode).get(0);
        }
        
        function getComboboxTestVm() {
            var testItem = {
                Name: ko.observable("Test Item"),
                Category: ko.observable()           
            };
            return {
                categories: ko.observableArray(),
                item: ko.observable(testItem)
            };
        }

    });

    /*********************************************************
    * PROJECTION: 
    * The next set of tests demo serverside projection for "security".
    * The Users query on the server actually projects into the
    * 'UserPartial' class which only has "safe" properties of the User type.
    * Properties like "Password" are excluded.
    * 'UserPartial' is NOT in server metadata
    *
    * See also metadataTests for example of adding 'UserPartial'
    * to client metadataStore ... and then querying them into cache
    *********************************************************/
    
    /*********************************************************/
    test("'Users' query returns objects of type 'UserPartial'", 3, function () {

        var query = EntityQuery.from("UserPartials").top(1);
        var em = newEm();
        
        verifyQuery(em, query,"userPartials",
            assertUserPartialIsNotAnEntity);
        
    });
    function assertUserPartialIsNotAnEntity(data) {
        var user = data.results[0];
        ok(user.entityType === undefined,
            "'user' result should not have an entityType");
        ok(user.Password === undefined,
            "'user' result should not have a 'Password' property");
    }
    /*********************************************************/
    test("'GetUserById' query returns 'UserPartial' with roles", 4, function () {

        var query = EntityQuery
            .from("GetUserById")
            .withParameters({ Id: 3 }); // id=3 has two UserRoles
        
        var em = newEm();

        verifyQuery(em, query, "GetUserById",
            assertUserPartialIsNotAnEntity,
            assertResultHasRoleNames);
        
        function assertResultHasRoleNames(data) {
            var user = data.results[0];
            ok(user.RoleNames.length > 0,
                "'user' result has role names: "+user.RoleNames);
        }
    });
    

    /*** LOCAL QUERY EXECUTION ***/

    module("queryTests (local)", testFns.getModuleOptions(newEm));

    /*********************************************************
    * customers starting w/ 'A' (query the cache)
    * Demonstrates that the same query works 
    * for both server and cache.
    *********************************************************/
    test("customers starting w/ 'A' (cache)", 4, function () {

        // query for customer starting with 'A', sorted by name 
        // will be used BOTH on server AND on client.
        // The "expand will be ignored locally but will run remotely
        var query = getQueryForCustomerA().expand("Orders"); 

        // query cache (synchronous)
        var em = newEm();
        var custs = em.executeQueryLocally(query);
        var count = custs.length;
        ok(count === 0,
            "no cached customers at all in a new EntityManager");

        stop(); // going async ... query server (same query object)
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
    * Combine remote and local query to get all customers 
    * including new, unsaved customers
    * v1 - Using FetchStrategy
    *********************************************************/
    test("combined remote & local query gets all customers w/ 'A'", 6, function () {

        var query = getQueryForCustomerA();

        // new 'A' customer in cache ... not saved
        var em = newEm();
        var newCustomer = addCustomer(em, "Acme");

        // query cache (synchronous)
        var custs = em.executeQueryLocally(query), count = custs.length;
        equal(count, 1, "1st local query returns one cached 'A' customer");

        stop(); // going async ... query server (same query object)

        queryForSome(em, query, "remote query for 'A' custs")

        .then(function (data) { // ... back from the server
            ok(data.results.indexOf(newCustomer) === -1,
                "remote query results do not include the unsaved newCustomer, " +
                newCustomer.CompanyName());

            // re-do both queries as a comboQuery
            return executeComboQueryWithFetchStrategy(em, query); 

        })

        .then(function (data) { // back from server with combined results

            var customers = data.results;
            count = customers.length;
            ok(count > 2,
                "have combined remote/local 'A' customers now; count = " + count);
            showCustomerResults(data);
            ok(customers.indexOf(newCustomer) >= 0,
                 "combo query results should include the unsaved newCustomer, " +
                newCustomer.CompanyName());
        })

        .fail(handleFail)
        .fin(start);
    });
    /*********************************************************
    * Combine remote and local query to get all customers 
    * including new, unsaved customers
    * v1=using FetchStrategy.FromLocalCache
    *********************************************************/
    test("combined remote & local query gets all customers w/ 'A' (v1 - FetchStrategy) ", 1, function () {

        var query = getQueryForCustomerA();

        // new 'A' customer in cache ... not saved
        var em = newEm();
        var newCustomer = addCustomer(em, "Acme");

        stop();// going async ..
        executeComboQueryWithFetchStrategy(em, query)
        .then(function (data) { // back from server with combined results

            var customers = data.results;
            ok(customers.indexOf(newCustomer) >= 0,
                 "combo query results should include the unsaved newCustomer, " +
                newCustomer.CompanyName());
        })

        .fail(handleFail)
        .fin(start);
    }); 
    /*********************************************************
    * Combine remote and local query to get all customers 
    * including new, unsaved customers
    * v2=using ExecuteLocally()
    *********************************************************/
    test("combined remote & local query gets all customers w/ 'A' (v2- ExecuteLocally) ", 1, function () {

        var query = getQueryForCustomerA();

        // new 'A' customer in cache ... not saved
        var em = newEm();
        var newCustomer = addCustomer(em, "Acme");

        stop(); // going async ..
        executeComboQueryWithExecuteLocally(em, query)
        .then(function (data) { // back from server with combined results

            var customers = data.results;
            ok(customers.indexOf(newCustomer) >= 0,
                 "combo query results should include the unsaved newCustomer, " +
                newCustomer.CompanyName());
        })

        .fail(handleFail)
        .fin(start);
    });
    
    test("combined remote & local query gets all Employees w/ 'A' (v2- ExecuteLocally) ", 1, function () {
        var em = newEm();
        
        // create an 'Alice' employee
        var alice = em.createEntity('Employee', { FirstName: 'Alice' });

        // query for Employees with names that begin with 'A'
        var query = EntityQuery.from('Employees')
                               .where('FirstName', 'startsWith', 'A')
                               .using(em);
        
        stop(); // going async ...
        
        // chain remote and local query execution
        var promise = query.execute()
            .then(function () { // ignore remote query results and chain to local query
                return query.using(breeze.FetchStrategy.FromLocalCache).execute();
            });

        promise.then(function (data) {
            var firstNames = data.results.map(function (emp) { return emp.FirstName(); });
            equal(firstNames.join(', '), "Alice, Andrew, Anne",
                "should have 3 employees with first names: 'Alice, Andrew, Anne'");
        })
        .fail(handleFail)
        .fin(start);
    });
    
    test("combined remote & local query for 'A' Employees ignores changed 'Anne'.", 3, function () {
        var em = newEm();
        var anne;
        var anneQuery = EntityQuery.from('Employees')
                                   .where('FirstName', 'eq', 'Anne')
                                   .using(em);

        // query for Employees with names that begin with 'A'
        var query = EntityQuery.from('Employees')
                               .where('FirstName', 'startsWith', 'A')
                               .using(em);

        stop(); // going async ...

        // Get Anne and change her first name
        anneQuery.execute().then(function (data) {
            anne = data.results[0];
            anne.FirstName("Charlene");
        })
        
        // chain remote and local query execution
        .then(function () {
            return query.execute()
                .then(function () { // ignore remote query results and chain to local query
                    return query.using(breeze.FetchStrategy.FromLocalCache).execute();
                });
        })

        .then(function (data) {
            var firstNames = data.results.map(function (emp) { return emp.FirstName(); });
            equal(firstNames.join(', '), "Andrew",
                "should have 1 employee with first name: 'Andrew'");
            equal(anne && anne.entityAspect.entityState, breeze.EntityState.Modified,
                "the 'Anne' entity should be in cache in the 'Modified' state");
            equal(anne.FirstName(), 'Charlene',
                "the 'Anne' entity should not be included because her local name is 'Charlene'");
        })
        .fail(handleFail)
        .fin(start);
    });
    /*********************************************************
    * Combined query that pours results into a list 
    * Caller doesn't have to wait for results
    * Useful in data binding scenarios
    *********************************************************/
    test("query customers w/ 'A' into a list", 3, function () {
        
        // list could be an observable array bound to the UI
        var customerList = []; 
        
        var query = getQueryForCustomerA();

        // new 'A' customer in cache ... not saved
        var em = newEm();
        var newCustomer = addCustomer(em, "Acme");
        
        stop(); // going async ..
        
        var promise = queryIntoList(em, query, customerList);
        
        // Application could ignore promise and 
        // let observable array update the UI when customers arrive.      
        // Our test waits to check that the list was filled
        promise.then(function() {
            var count = customerList.length;
            ok(count > 2,
              "have combined remote/local 'A' customers in list; count = " + count);
            showCustomerResults({ results: customerList });
            ok(customerList.indexOf(newCustomer) >= 0,
                 "combo query results should include the unsaved newCustomer, " +
                newCustomer.CompanyName());
        })
        .fail(handleFail)
        .fin(start);
    });

    // Pours results of any combined query into a list
    // returns a promise to return that list after it's filled
    // Consider for your "DataService" class
    function queryIntoList(em, query, list) {
        list = list || [];
        return executeComboQueryWithFetchStrategy(em, query)
            .then(function (data) {
                data.results.forEach(function (c) { list.push(c); });
                return list;
            });
    }
    
    /*********************************************************
    * "Query Local" module helpers
    *********************************************************/
    
    // a query for customers starting with 'A', sorted by name
    function getQueryForCustomerA() {
        return new EntityQuery("Customers")
            .where("CompanyName", "startsWith", "A")
            .orderBy("CompanyName");
    }
  
    // Execute any query remotely, then execute locally
    // returning the same shaped promise as the remote query
    // Recommended for your "DataService" class
    function executeComboQueryWithFetchStrategy(em, query) {
        query = query.using(em);
        return query.execute()
            .then(function() { // ignore remote query results
                return query.using(breeze.FetchStrategy.FromLocalCache).execute();
            });
    }
    
    // executeQueryLocally, wrapped in a promise, is the more tedious alternative
    function executeComboQueryWithExecuteLocally(em, query) {
        query = query.using(em);
        return query.execute()
            .then(function () { // ignore remote query results
                return Q.fcall(// return synch query as a promise
                    function () { return { results: query.executeLocally() }; }
                );
            });
    }
    
    /*** Query By Id (cache or remote) ***/

    module("queryTests (by id)", testFns.getModuleOptions(newEm));

    /*********************************************************
     * Fetch unchanged Customer by key found on server
     *********************************************************/
    test("fetchEntityByKey of Customer found on the server", 2,
        function () {

            var em = newEm(); // empty manager
            var id = testFns.wellKnownData.alfredsID;

            stop(); // should go async
            em.fetchEntityByKey("Customer", id,
                // Look in cache first; it won't be there
               /* checkLocalCacheFirst */ true) 
              .then(fetchSucceeded)
              .fail(handleFail)
              .fin(start);

            function fetchSucceeded(data) {
                var customer = data.entity;
                var name = customer && customer.CompanyName();
                var entityState = customer && customer.entityAspect.entityState;
                ok(entityState.isUnchanged, "should have found unchanged customer, " + name);
                ok(!data.fromCache, "should have queried the service");
            }
        });
    /*********************************************************
    * Fetch unchanged Customer by key found in cache
    *********************************************************/
    test("fetchEntityByKey of unchanged Customer found in cache", 2,
        function () {

            var em = newEm(); // empty manager
            var id = '11111111-2222-3333-4444-555555555555';
            // fake it in cache so we can find it
            attachCustomer(em, id);

            stop(); // actually won't go async
            em.fetchEntityByKey("Customer", id,
               // Look in cache first; it will be there this time
               /* checkLocalCacheFirst */ true)
              .then(fetchSucceeded)
              .fail(handleFail)
              .fin(start);

            function fetchSucceeded(data) {
                var customer = data.entity;
                var name = customer && customer.CompanyName();
                var entityState = customer && customer.entityAspect.entityState;
                ok(entityState.isUnchanged, "should have found unchanged customer, " + name);
                ok(data.fromCache, "should have found customer in cache");
            }
        });
    /*********************************************************
     * Fetch OrderDetail by its 2-part key from cache from server
     *********************************************************/
    test("fetchEntityByKey of OrderDetail by 2-part key from server", 2,
        function () {

            var em = newEm(); // empty manager
            var orderDetailKey = testFns.wellKnownData.alfredsOrderDetailKey;

            stop(); // should go async
            em.fetchEntityByKey("OrderDetail",
                orderDetailKey.OrderID,
                orderDetailKey.ProductID) // don't bother looking in cache
              //.expand("Product") // sorry ... can't use expand
              .then(fetchSucceeded)
              .fail(handleFail)
              .fin(start);

            function fetchSucceeded(data) {
                var orderDetail = data.entity;
                ok(orderDetail, "should have found OrderDetail for " + 
                    JSON.stringify(orderDetailKey));
                ok(!data.fromCache, "should have queried the service");
            }
        });

    /*********************************************************
    * fetchEntityByKey of non-existent Customer returns null
    *********************************************************/
    test("fetchEntityByKey of non-existent Customer returns null", 2,
    function () {

        var em = newEm(); // empty manager
        var id = '11111111-2222-3333-4444-555555555555';

        stop(); // should go async
        em.fetchEntityByKey("Customer", id,
           /* checkLocalCacheFirst */ true)
          .then(fetchSucceeded)
          .fail(handleFail)
          .fin(start);

        function fetchSucceeded(data) {
            // fetch "succeeds" even when entity is not found
            // "success" == "did not break"
            ok(data.entity == null, "should not find customer with id " + id);
            ok(!data.fromCache, "should have checked the server");
        }
    });
    /*********************************************************
    * fetchEntityByKey of Customer marked-for-delete returns null
    *********************************************************/
    test("fetchEntityByKey of Customer marked-for-delete returns null", 2,
    function () {

        var em = newEm(); // empty manager
        var id = '11111111-2222-3333-4444-555555555555';
        // fake it in cache so we can find it
        var customer = attachCustomer(em, id);
        customer.entityAspect.setDeleted();

        stop(); // actually won't go async
        em.fetchEntityByKey("Customer", id,
           /* checkLocalCacheFirst */ true)
          .then(fetchSucceeded)
          .fail(handleFail)
          .fin(start);

        function fetchSucceeded(data) {
            // fetch "succeeds" even when entity is deleted
            // "success" == "did not break"
            ok(data.entity == null, "should not find deleted customer with id " + id);
            ok(data.fromCache, "should NOT have checked the server");
        }
    });
    /*********************************************************
    * getEntityByKey of Customer marked-for-delete returns the deleted entity
    * getEntityByKey is a synchronous method that only looks at cache
    *********************************************************/
    test("getEntityByKey of Customer marked-for-delete returns the deleted entity", 2,
    function () {

        var em = newEm(); // empty manager
        var id = '11111111-2222-3333-4444-555555555555';
        // fake it in cache so we can find it
        var customer = attachCustomer(em, id);
        customer.entityAspect.setDeleted();

        var entity = em.getEntityByKey("Customer", id);
        
        ok(entity == customer, "should find deleted customer with id " + id);
        equal(entity.entityAspect.entityState.name, "Deleted",
            "customer should be in 'Deleted' state.");
    });
    /*********************************************************************
     * This portion of the "queryTests (by id)" module  
     * tests a hand-built async getById utility that was the way to do it 
     * before EntityManager.fetchEntityByKey
     * A curiosity now.
     ********************************************************************/
    
    // This hand-built async getById utility method returns a promise.
    // A successful promise returns the entity if found in cache 
    // or if found remotely.
    // Returns null if not found or if found in cache but is marked deleted.
    // Caller should check for query failure.
    // 'queryResult' reports if queried the remote service 
    // and holds a found entity even if it is marked for deletion.
    // 
    // This fnc has been largely replaced by EntityManager.fetchEntityByKey.
    function getByIdCacheOrRemote(manager, typeName, id, queryResult) {
        // get key for entity of specified type and id
        var typeInfo = manager.metadataStore.getEntityType(typeName);
        var key = new breeze.EntityKey(typeInfo, id);

        // look in cache first
        var entity = manager.getEntityByKey(key);
        if (entity) {
            queryResult.queriedRemotely = false; // found it in cache
            queryResult.entity = entity;
            // return entity, wrapped in promise (set null if deleted)
            return Q((entity.entityAspect.entityState.isDeleted()) ?
                    null : entity); // return null if marked for delete!
        }
        // not in cache; try remotely
        queryResult.queriedRemotely = true; // queried the service
        return EntityQuery
            .fromEntityKey(key)
            .using(manager).execute()
            .then(function (data) {
                entity = data.results[0] || null;
                return queryResult.entity = entity;
            });
    }
    
    /*********************************************************
     * [obsolete] Get unchanged customer by id from cache from server
     *********************************************************/
    test("getById of unchanged customer from server [obsolete]", 2,
        function () {

            var em = newEm(); // empty manager
            var id = testFns.wellKnownData.alfredsID;
            var queryResult = { };

            stop(); // might go async
            getByIdCacheOrRemote(em, "Customer", id, queryResult)
            .then(querySucceeded).fail(handleFail).fin(start);

            function querySucceeded(customer) {
                var name = customer && customer.CompanyName();
                var entityState = customer && customer.entityAspect.entityState;
                ok(entityState.isUnchanged, "should have found unchanged customer, "+name);
                ok(queryResult.queriedRemotely, "should have queried the service");
            }
        });
    /*********************************************************
    * Get unchanged customer by id from cache 
    *********************************************************/
    test("getById of unchanged customer from cache [obsolete]", 2,
        function () {

            var em = newEm(); // empty manager
            var id = testFns.wellKnownData.alfredsID;
            var queryResult = {};
            attachCustomer(em, id);

            stop(); // might go async
            getByIdCacheOrRemote(em, "Customer", id, queryResult)
            .then(querySucceeded).fail(handleFail).fin(start);

            function querySucceeded(customer) {
                var name = customer && customer.CompanyName();
                var entityState = customer && customer.entityAspect.entityState;
                ok(entityState.isUnchanged, "should have found unchanged customer, " + name);
                ok(!queryResult.queriedRemotely, "should have found customer in cache");
            }
        });
    /*********************************************************
    * getById of deleted customer in cache returns null
    *********************************************************/
    test("getById of deleted customer in cache returns null [obsolete]", 3,
        function () {

            var em = newEm(); // empty manager
            var id = testFns.wellKnownData.alfredsID;
            var queryResult = {};
            var cust = attachCustomer(em, id);
            cust.entityAspect.setDeleted();

            stop(); // might go async
            getByIdCacheOrRemote(em, "Customer", id, queryResult)
            .then(querySucceeded).fail(handleFail).fin(start);

            function querySucceeded(customer) {
                ok(customer === null,
                    "query should return null because customer marked for deletion");
                customer = queryResult.entity; // we remembered it for the test
                var name = customer && customer.CompanyName();
                var entityState = customer && customer.entityAspect.entityState;
                ok(entityState.isDeleted, "should have found deleted customer, " + name);
                ok(!queryResult.queriedRemotely, "should have found deleted customer in cache");
            }
        });
     /*********************************************************
     * getById of non-existent customer returns null after looking in cache and server
     *********************************************************/
     test("getById of non-existent customer returns null [obsolete]", 2,
        function () {

            var em = newEm(); // empty manager
            var id = '11111111-2222-3333-4444-555555555555';
            var queryResult = {};

            stop(); // might go async
            getByIdCacheOrRemote(em, "Customer", id, queryResult)
            .then(querySucceeded).fail(handleFail).fin(start);

            function querySucceeded(customer) {
                ok(customer === null,
                    "query should return null because customer doesn't exist");
                ok(queryResult.queriedRemotely, "should have queried the server");
            }
        });
    
    /*********************************************************
    * Test helpers
    *********************************************************/
    
     // create a new Customer and add to the EntityManager
     function addCustomer(em, name) {
         var cust = em.createEntity('Customer', {
             CustomerID: testFns.newGuidComb(),
             CompanyName: name || 'a-new-company'
         });
         return cust;
     }
 
    // create a Customer and attache to manager 
    // as if queried and unchanged from server
     function attachCustomer(manager, id) {
         var customer = manager.createEntity('Customer', {
             CustomerID: id,
             CompanyName: "Test Customer"
         }, breeze.EntityState.Unchanged);
         return customer;
    }

})(docCode.testFns);