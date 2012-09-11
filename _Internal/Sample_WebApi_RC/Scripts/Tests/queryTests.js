require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;
    var EntityQuery = entityModel.EntityQuery;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityKey = entityModel.EntityKey;
    var FilterQueryOp = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;
    var QueryOptions = entityModel.QueryOptions;
    var FetchStrategy = entityModel.FetchStrategy;
    var MergeStrategy = entityModel.MergeStrategy;

    var metadataStore = new MetadataStore();
    var newEm = function () {
        return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: metadataStore });
    };

    module("query", {
        setup: function () {
            if (!metadataStore.isEmpty()) return;
            stop();
            var em = newEm();
            em.fetchMetadata(function (rawMetadata) {
                var isEmptyMetadata = metadataStore.isEmpty();
                ok(!isEmptyMetadata);

                start();
            }).fail(testFns.handleFail);
        },
        teardown: function () {
        }
    });
    
    test("Order.OrderDate is a DateTime", function () {

        // This is what the type of a date should be
        var someDate = new Date();
        ok("object" === typeof someDate,
            "typeof someDate is " + typeof someDate);
    
        var firstOrderQuery = new EntityQuery("Orders")
            .take(1);

        var em = newEm();
        stop();
        em.executeQuery(firstOrderQuery).then(function(data) {
            var order = data.results[0];
            var orderDate = order.getProperty("OrderDate");

            // THIS TEST FAILS!
            ok("object" === typeof orderDate,
                "typeof OrderDate is " + typeof orderDate);
            ok(core.isDate(orderDate), "should be a date");
            start();
        }).fail(testFns.handleFail);

    });

    
    test("queryOptions using", function() {
        var qo = new QueryOptions();
        ok(qo.fetchStrategy === FetchStrategy.FromServer, "fetchStrategy.FromServer");
        ok(qo.mergeStrategy === MergeStrategy.PreserveChanges, "mergeStrategy.PreserveChanges");
        qo = qo.using(FetchStrategy.FromLocalCache);
        ok(qo.fetchStrategy === FetchStrategy.FromLocalCache, "fetchStrategy.FromLocalCache");
        qo = qo.using({ mergeStrategy: MergeStrategy.OverwriteChanges });
        ok(qo.mergeStrategy === MergeStrategy.OverwriteChanges, "mergeStrategy.OverwriteChanges");
        
    });

    test("queryOptions errors", function() {
        var qo = new QueryOptions();
        try {
            qo.using(true);
            ok(false, "should not get here-not a config");
        } catch(e) {
            ok(e, e.message);
        }

        try {
            qo.using({ mergeStrategy: 6 });
            ok(false, "should not get here, bad mergeStrategy");
        } catch(e) {
            ok(e, e.message);
        }

        try {
            qo.using({ mergeStrategy: MergeStrategy.OverwriteChanges, foo: "huh" });
            ok(false, "should not get here, unknown property in config");
        } catch(e) {
            ok(e, e.message);
        }

    });

    test("update key on pk change", function() {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var customer = custType.createEntity();
        customer.setProperty("CompanyName","[don't know name yet]");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        em.attachEntity(customer);
        customer.setProperty("CustomerID", alfredsID); 
        var ek = customer.entityAspect.getKey();
        var sameCustomer = em.findEntityByKey(ek);
        ok(customer === sameCustomer, "customer should == sameCustomer");
    });
    
    test("reject change to existing key", function() {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers").where("CustomerID", "==", alfredsID);
        stop();
        query.using(em).execute().then(function(data) {        
            ok(data.results.length === 1,"should have fetched 1 record");
            var customer = custType.createEntity();        
            em.attachEntity(customer);
            try {
                customer.setProperty("CustomerID", alfredsID); 
                ok(false, "should not get here");
            } catch(e) {
                ok(e.message.indexOf("key") > 0);
            }
            start();
        }).fail(testFns.handleFail);
    });

    test("fill placeholder customer asynchronously", function() {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var customer = custType.createEntity();
        customer.setProperty("CompanyName","[don't know name yet]");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        // TEST PASSES (NO DUPLICATE) IF SET ID HERE ... BEFORE ATTACH
        // customer.CustomerID(testFns.wellKnownData.alfredsID); // 785efa04-cbf2-4dd7-a7de-083ee17b6ad2

        em.attachEntity(customer);

        // TEST FAILS  (2 IN CACHE W/ SAME ID) ... CHANGING THE ID AFTER ATTACH
        customer.setProperty("CustomerID", alfredsID); // 785efa04-cbf2-4dd7-a7de-083ee17b6ad2
        var ek = customer.entityAspect.getKey();
        var sameCustomer = em.findEntityByKey(ek);
        customer.entityAspect.setUnchanged();
        
        // SHOULD BE THE SAME. EITHER WAY ITS AN ATTACHED UNCHANGED ENTITY
        ok(customer.entityAspect.entityState.isUnchanged,
            "Attached entity is in state " + customer.entityAspect.entityState);

        ok(em.getEntities().length === 1,
            "# of entities in cache is " + em.getEntities().length);

        // this refresh query will fill the customer values from remote storage
        var refreshQuery = entityModel.EntityQuery.fromEntities(customer);

        stop(); // going async ...

        refreshQuery.using(em).execute().then(function(data) {
            var results = data.results, count = results.length;
            if (count != 1) {
                ok(false, "expected one result, got " + count);
            } else {
                var inCache = em.getEntities();
                if (inCache.length === 2) {

                    // DUPLICATE ID DETECTED SHOULD NEVER GET HERE
                    var c1 = inCache[0], c2 = inCache[1];
                    ok(false,
                        "Two custs in cache with same ID, ({0})-{1} and ({2})-{3}".format(// format is my extension to String
                            c1.getProperty("CustomerID"), c1.getProperty("CompanyName"), c2.getProperty("CustomerID"), c2.getProperty("CompanyName")));
                }

                // This test should succeed; it fails because of above bug!!!
                ok(results[0] === customer,
                    "refresh query result is the same as the customer in cache" +
                        " whose updated name is " + customer.CompanyName());
            }
        }).fail(testFns.handleFail).fin(start);
    });

    
    test("resource name query case sensitivity", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("customers");
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have some results");
        }).then(function () {
            var q2 = new EntityQuery().from("Customers");
            return em.executeQuery(q2);
        }).then(function (data2) {
            ok(data2.results.length > 0, "should have some results - 2");
            start();
        }).fail(testFns.handleFail);

    });

    test("resource name local query case sensitivity", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers");
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have some results");
        }).then(function () {
            var q2 = new EntityQuery().from("customers");
            var customers = em.executeQueryLocally(q2);
            ok(customers.length > 0, "local query should have some results")
            start();
        }).fail(testFns.handleFail);

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
            .where("CompanyName", "startsWith", "C");
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
            start();
        }).fail(testFns.handleFail);
              
    });

    test("named query", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("CustomersStartingWithA");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have some results");
            start();
        }).fail(testFns.handleFail);
    });
    
     test("query region and territories", function () {
        var em = newEm();
        var q = new EntityQuery()
            .from("Regions")
            .take(1);

        stop();
        em.executeQuery(q).then(function (data) {
            var region = data.results[0];
            var terrs = region.getProperty("Territories");
            return terrs.load();
        }).then(function (data2) {
            ok(data2.results.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

    
    test("select - anon simple", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("CompanyName", "startsWith", "C")
            .select("CompanyName");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.CompanyName);
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select - anon collection", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = EntityQuery.from("Customers")
            .where("CompanyName", "startsWith", "C")
            .select("Orders");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(Array.isArray(a.Orders));
                a.Orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("select - anon simple, collection", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery("Customers")
            .where("CompanyName", "startsWith", "C")
            .orderBy("CompanyName")
            .select("CompanyName, Orders");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.CompanyName);
                ok(Array.isArray(a.Orders));
                a.Orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select - anon simple, entity collection", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = EntityQuery
            .from("Orders")
            .where("Customer.CompanyName", "startsWith", "C")
            .orderBy("Customer.CompanyName")
            .select("Customer.CompanyName, Customer, OrderDate");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var customerType = em.metadataStore.getEntityType("Customer");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(typeof (a.Customer_CompanyName) == 'string', "Customer_CompanyName is not a string");
                ok(a.Customer.entityType === customerType, "a.Customer is not of type Customer");
                ok(a.OrderDate !== undefined, "OrderDate should be  undefined");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("starts with op", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("CompanyName", "startsWith", "C")
            .orderBy("CompanyName");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query, function (data) {
            var customers = data.results;
            testFns.assertIsSorted(customers, "CompanyName");
            customers.forEach(function (c) {
                ok(c.CompanyName, 'should have a companyName property');
                var key = c.entityAspect.getKey();
                ok(key, "missing key");
                var c2 = em.findEntityByKey(key);
                ok(c2 === c, "entity not cached");
            });
            start();
        }).fail(testFns.handleFail);
    });

    asyncTest("greater than op", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = EntityQuery.from("Orders")
            .where("Freight", ">", 100);

        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

   
    asyncTest("predicate", function () {
        var em = new EntityManager(testFns.ServiceName);

        var baseQuery = EntityQuery.from("Orders");
        var pred1 = new Predicate("Freight", ">", 100);
        var pred2 = new Predicate("OrderDate", ">", new Date(1998, 3, 1));
        var query = baseQuery.where(pred1.and(pred2));
        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });
    
     asyncTest("predicate 2", function () {
        var em = new EntityManager(testFns.ServiceName);

        var baseQuery = EntityQuery.from("Orders");
         var pred1 = Predicate.create("Freight", ">", 100);
        var pred2 = Predicate.create("OrderDate", ">", new Date(1998, 3, 1));
        var newPred = Predicate.and([pred1, pred2]);
        var query = baseQuery.where(newPred);
        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

    asyncTest("predicate 3", function () {
        var em = new EntityManager(testFns.ServiceName);

        var baseQuery = EntityQuery.from("Orders");
        var pred = Predicate.create("Freight", ">", 100)
            .and("OrderDate", ">", new Date(1998, 3, 1));
        var query = baseQuery.where(pred);
        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });



    asyncTest("not predicate with null", function () {
        var em = new EntityManager(testFns.ServiceName);

        var pred = new Predicate("Region", FilterQueryOp.Equals, null);
        pred = pred.not();
        var query = new EntityQuery()
            .from("Customers")
            .where(pred)
            .take(10);

        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 0);
            customers.forEach(function (customer) {
                var region = customer.getProperty("Region");
                ok(region != null, "region should not be either null or undefined");
            });
            start();
        }).fail(testFns.handleFail);
    });

    asyncTest("fromEntities", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Orders")
            .take(2);

        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length == 2, "data.results length should be 2");
            var q2 = EntityQuery.fromEntities(orders);
            return em.executeQuery(q2);
        }).then(function (data2) {
            ok(data2.results.length == 2, "data.results length should be 2");
            start();
        }).fail(testFns.handleFail);
    });

    test("where nested property", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
             .from("Products")
             .where("Category.CategoryName", "startswith", "S")
             .expand("Category");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("Category");
            });
            cats.forEach(function(cat) {
                var catName = cat.getProperty("CategoryName");
                ok(core.stringStartsWith(catName, "S"));
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("where nested property 2", function () {
        var em = new EntityManager(testFns.ServiceName);

         var query = new EntityQuery()
             .from("Orders")
             .where("Customer.Region", "==", "CA");
        var queryUrl = query._toUri();
        stop();
        em.executeQuery(query).then(function (data) {
            var customers = data.results;
            ok(customers.length > 0, "some customers should have been found");
            start();
        }).fail(testFns.handleFail);
    });

    test("orderBy", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery("Products")
            .orderBy("ProductName desc")
            .take(5);
        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var productName = products[0].getProperty("ProductName");
            testFns.assertIsSorted(products, "ProductName", false);
            start();
        }).fail(testFns.handleFail);
    });

    test("expand", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Products");

        query = query.expand("Category")
            .take(5);
        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = [];
            products.map(function (product) {
                var cat = product.getProperty("Category");
                if (cat) {
                    cats.push(cats);
                }
            });
            ok(cats.length == 5, "should have 5 categories");

            start();
        }).fail(testFns.handleFail);
    });

    test("expand multiple", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery("Orders");

        query = query.expand("Customer, Employee")
            .take(20);
        stop();
        em.executeQuery(query).then(function(data) {
            var orders = data.results;
            var custs = [];
            var emps = [];
            orders.map(function(order) {
                var cust = order.getProperty("Customer");
                if (cust) {
                    custs.push(cust);
                }
                var emp = order.getProperty("Employee");
                if (emp) {
                    emps.push(emp);
                }
            });
            ok(custs.length == 20, "should have 20 customers");
            ok(emps.length == 20, "should have 20 employees");

            start();
        }).fail(testFns.handleFail);
    });
    
    test("expand nested", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Orders");

        query = query.expand("Customer, OrderDetails, OrderDetails.Product")
            .take(5);
        stop();
        em.executeQuery(query).then(function(data) {
            var orders = data.results;
            var custs = [];
            var orderDetails = [];
            var products = [];
            orders.map(function(order) {
                var cust = order.getProperty("Customer");
                if (cust) {
                    custs.push(cust);
                }
                var orderDetailItems = order.getProperty("OrderDetails");
                if (orderDetailItems) {
                    Array.prototype.push.apply(orderDetails, orderDetailItems);
                    orderDetailItems.map(function(orderDetail) {
                        var product = orderDetail.getProperty("Product");
                        if (product) {
                            products.push(product);
                        }
                    });
                }
            });
            ok(custs.length == 5, "should have 5 customers");            
            ok(orderDetails.length > 5, "should have > 5 orderDetails");
            ok(products.length > 5, "should have > 5 products");

            start();
        }).fail(testFns.handleFail);
    });

    test("orderBy nested", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Products")
            .orderBy("Category.CategoryName desc")
            .expand("Category");

        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("Category");
            });

            testFns.assertIsSorted(cats, "CategoryName", true);
            start();
        }).fail(testFns.handleFail);
    });

    test("orderBy two part nested", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Products")
            .orderBy("Category.CategoryName desc, ProductName")
            .expand("Category");

        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("Category");
            });

            testFns.assertIsSorted(cats, "CategoryName", true);
            start();
        }).fail(testFns.handleFail);
    });

    test("skiptake", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Products")
            .orderBy("ProductName");
        var sc = new testFns.StopCount(3);
        var skipTakeCount = 5;
        em.executeQuery(query, function (data) {
            var products = data.results;

            var newq1 = query.skip(skipTakeCount);
            var newq1Url = newq1._toUri();
            em.executeQuery(newq1, function (data1) {
                var custs1 = data1.results;
                equals(custs1.length, products.length - skipTakeCount);
                sc.start();
            }).fail(testFns.handleFail);

            var newq2 = query.take(skipTakeCount);
            var newq2Url = newq1._toUri();
            em.executeQuery(newq2, function (data2) {
                var custs2 = data2.results;
                equals(custs2.length, skipTakeCount);
                sc.start();
            }).fail(testFns.handleFail);

            var newq3 = query.skip(skipTakeCount).take(skipTakeCount);
            var newq3Url = newq1._toUri();
            em.executeQuery(newq3, function (data3) {
                var custs3 = data3.results;
                equals(custs3.length, skipTakeCount);
                sc.start();
            }).fail(testFns.handleFail);

        }).fail(testFns.handleFail);
    });

    asyncTest("query expr - toLower", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("toLower(CompanyName)", "startsWith", "c");
        var queryUrl = query._toUri();

        em.executeQuery(query, function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var name = cust.getProperty("CompanyName").toLowerCase();
                return core.stringStartsWith(name, "c");
            }), "every cust should startwith a 'c'");
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("query expr - toUpper/substring", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("toUpper(substring(CompanyName, 1, 2))", "startsWith", "OM");
        var queryUrl = query._toUri();

        em.executeQuery(query, function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var val= cust.getProperty("CompanyName").substr(1,2).toUpperCase();
                return val == "OM";
            }), "every cust should have 'OM' as the 2nd and 3rd letters");
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("query expr - length", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("length(CompanyName)", ">", 20);
        var queryUrl = query._toUri();

        em.executeQuery(query, function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var val = cust.getProperty("CompanyName");
                return val.length > 20;
            }), "every cust have a name longer than 20 chars");
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("query expr - navigation then length", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Orders")
            .where("length(Customer.CompanyName)", ">", 30)
            .expand("Customer");
        var queryUrl = query._toUri();

        em.executeQuery(query, function(data) {
            var orders = data.results;
            ok(orders.length > 0);
            ok(orders.every(function(order) {
                var cust = order.getProperty("Customer");
                var val = cust.getProperty("CompanyName");
                return val.length > 30;
            }), "every order must have a cust with a name longer than 30 chars");
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("bad query expr -  bad property name", function() {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Orders")
            .where("length(Customer.FooName)", ">", 30);
        var queryUrl = query._toUri();

        em.executeQuery(query, function(data) {
            ok(false, "should not get here");
            start();
        }, function (error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("FooName") > 0, "bad message");
            error.handled = true;
            start();
        }).fail(testFns.handleFail);
    });
    
    test("bad odata expr", function () {
        stop();

        var em = new EntityManager(testFns.ServiceName);
        var query = "Customers?$filter=starxtswith(CompanyName, 'A') eq true&$orderby=CompanyName desc";

        em.executeQuery(query).fail(function (error) {
            ok(error instanceof Error, "should be an error");
            ok(error.message.indexOf("starxtswith") > -1, "error message has wrong text");
            start();
        }).fail(testFns.handleFail);
    });
    
    test("bad filter operator", function () {
        var em = new EntityManager(testFns.ServiceName);

         try {
            var query = new EntityQuery()
            .from("Customers")
            .where("CompanyName", "startsXWith", "C");
            ok(false, "shouldn't get here");
        } catch (error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("startsXWith") > 0, "bad message");
        }
    });   

    asyncTest("bad filter property", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("badCompanyName", "startsWith", "C");
        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            ok(false, "shouldn't get here");
            start();
        }, function (error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("badCompanyName") > 0, "bad message");
            error.handled = true;
            start();
        }).fail(testFns.handleFail);

    });

    asyncTest("bad orderBy property ", function () {
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("Customers")
            .where("CompanyName", FilterQueryOp.StartsWith, "C")
            .orderBy("badCompanyName");
        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            ok(false, "shouldn't get here");
            start();
        }, function (error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("badCompanyName") > 0, "bad message");
            error.handled = true;
            start();
        }).fail(testFns.handleFail);

    });

    test("by EntityQuery.fromEntityKey ", function () {
        var em = newEm();
        var empType = metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            ok(emp.getProperty("EmployeeID") === 1);
            start();
            return;
        }).fail(testFns.handleFail);

    });

    test("by EntityQuery.fromEntityNavigation  - (-> n) ", function () {
        var em = newEm();
        var empType = metadataStore.getEntityType("Employee");
        var orderType = metadataStore.getEntityType("Order");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            ok(emp.getProperty("EmployeeID") === 1);
            var np = emp.entityType.getProperty("Orders");
            var q2 = EntityQuery.fromEntityNavigation(emp, np);
            em.executeQuery(q2, function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType === orderType; }));
                var orders = emp.getProperty("Orders");
                ok(orders.length == data2.results.length, "local array does not match queried results");
                start();
            }).fail(testFns.handleFail);
        }).fail(testFns.handleFail);

    });

    test("by EntityQuery.fromEntityNavigation - (-> 1) ", function() {
        var em = newEm();

        var query = EntityQuery.from("Orders").take(1);

        stop();
        em.executeQuery(query, function(data) {
            var order = data.results[0];
            ok(order.entityType.shortName === "Order");
            var np = order.entityType.getProperty("Employee");
            ok(np, "can't find nav prop 'Employee'");
            var q2 = EntityQuery.fromEntityNavigation(order, np);
            em.executeQuery(q2, function(data2) {
                ok(data2.results.length === 1, "wrong amount of data returned");
                ok(data2.results[0].entityType.shortName === "Employee");
                start();
            }).fail(testFns.handleFail);
        }).fail(testFns.handleFail);

    });

    test("by entityAspect.loadNavigationProperty - (-> n) ", function () {
        var em = newEm();
        var empType = metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            emp.entityAspect.loadNavigationProperty("Orders", function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType.shortName = "Order"; }));
                var orders = emp.getProperty("Orders");
                ok(orders.length == data2.results.length, "local array does not match queried results");
                start();
            }).fail(testFns.handleFail);
        }).fail(testFns.handleFail);

    });

    test("by entityAspect.loadNavigationProperty - (-> 1) ", function () {
        var em = newEm();
        var query = EntityQuery.from("Orders").take(1);
        em.tag = "xxxx";
        stop();
        var order;
        em.executeQuery(query).then(function (data) {
            order = data.results[0];
            ok(order.entityType.shortName === "Order");
            var emp = order.getProperty("Employee");
            ok(emp === null, "emp should start null");
            return order.entityAspect.loadNavigationProperty("Employee");
        }).then(function (data2) {
            ok(data2.results.length === 1, "wrong amount of data returned");
            ok(data2.results[0].entityType.shortName === "Employee");
            var sameEmp = order.getProperty("Employee");
            ok(data2.results[0] === sameEmp, "query results do not match nav results");
            var orders = sameEmp.getProperty("Orders");
            var ix = orders.indexOf(order);
            ok(ix >= 0, "can't find order in reverse lookup");
            start();
        }).fail(testFns.handleFail);

    });

    test("load from navigationProperty value.load (-> n)", function () {
        var em = newEm();
        var empType = metadataStore.getEntityType("Employee");
        var orderType = metadataStore.getEntityType("Order");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            var orders = emp.getProperty("Orders");
            ok(orders.length === 0, "orders length should start at 0");
            orders.load(function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType === orderType; }));
                ok(orders.length == data2.results.length, "local array does not match queried results");
                start();
            }).fail(testFns.handleFail);
        }).fail(testFns.handleFail);

    });

    asyncTest("local query", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("Freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("Freight", ">=", 500);


        em.executeQuery(query, function (data) {
            var orders = data.results;
            var ordersL = em.executeQueryLocally(query);
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            var orders2 = em.executeQueryLocally(query2);
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function (o) { return o.getProperty("Freight") >= 500; }));
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("local query - fetchStrategy", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("Freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("Freight", ">=", 500);

        var orders;
        em.executeQuery(query).then(function (data) {
            orders = data.results;
            query = query.using(FetchStrategy.FromLocalCache);
            return em.executeQuery(query);
        }).then(function (dataLocal) {
            var ordersL = dataLocal.results;
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            em.defaultQueryOptions = new QueryOptions({ fetchStrategy: FetchStrategy.FromLocalCache });
            return em.executeQuery(query2);
        }).then(function(data2) {
            var orders2 = data2.results;
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function(o) { return o.getProperty("Freight") >= 500; }));
            start();
        }).fail(testFns.handleFail);
    });

    test("server side include many with filter - customers and orders", function () {
        if (!testFns.DEBUG_WEBAPI) return;
        stop();
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("CompanyName", "startsWith", "A")
            .orderBy("CompanyName")
            .take(4);
        var queryUrl = query._toUri();

        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 2, "no customers found");
            testFns.assertIsSorted(customers, "CompanyName");
            customers.forEach(function (c) {
                ok(c.getProperty("CompanyName"), 'should have a companyName property');
                var orders = c.getProperty("Orders");
                ok(orders.length > 0, "Orders should be populated");
                var matchingCust = orders[0].getProperty("Customer");
                ok(c === matchingCust, "relationship not updated");
                var ckey = c.entityAspect.getKey();
                ok(ckey, "missing key");
                var c2 = em.findEntityByKey(ckey);
                ok(c2 === c, "cust not cached");
                var okey = orders[0].entityAspect.getKey();
                var o2 = em.findEntityByKey(okey);
                ok(o2 === orders[0], "order not cached");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("server side include many with take - customers and orders", function () {
        if (!testFns.DEBUG_WEBAPI) return;
        expect(5);
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("CompanyName", FilterQueryOp.StartsWith, "C")
            .take(1);

        var sc = new testFns.StopCount(2);

        em.executeQuery(query, function (data) {

            ok(data.results.length === 1, "query should only return a single cust");
            var cust = data.results[0];
            var custKey = cust.entityAspect.getKey();
            var orders = cust.getProperty("Orders");
            var orderKeys = orders.map(function (o) { return o.entityAspect.getKey(); });
            var custQuery = EntityQuery.fromEntities(cust);

            var ordersQuery = EntityQuery.fromEntities(orders);
            var em2 = new EntityManager(testFns.ServiceName);

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
        if (!testFns.DEBUG_WEBAPI) return;
        stop();
        var em = new EntityManager(testFns.ServiceName);

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("CompanyName", "startsWith", "A")
            .orderBy("CompanyName")
            .take(4);
        var queryUrl = query._toUri();

        em.executeQuery(query).then(function (data) {
            var customers = data.results;
            ok(customers.length == 4, "wrong number of customers");

            customers.forEach(function (c) {
                ok(c.getProperty("CompanyName"), 'should have a companyName property');
                var orders = c.getProperty("Orders");
                ok(orders.length > 0, "Orders should be populated");
                var matchingCust = orders[0].getProperty("Customer");
                ok(c === matchingCust, "relationship not updated");
                var ckey = c.entityAspect.getKey();
                ok(ckey, "missing key");
                var c2 = em.findEntityByKey(ckey);
                ok(c2 === c, "cust not cached");
                var okey = orders[0].entityAspect.getKey();
                var o2 = em.findEntityByKey(okey);
                ok(o2 === orders[0], "order not cached");
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("raw odata with filter and order by", function () {
        stop();
        var em = new EntityManager({ serviceName: testFns.ServiceName, metadataStore: new MetadataStore() });
        ok(em, "no em found");

        var query = "Customers?$filter=startswith(CompanyName, 'A') eq true&$orderby=CompanyName desc&$expand=Orders";
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var customers = data.results;
            customers.forEach(function (c) {
                ok(c.getProperty("CompanyName"), "missing CompanyName property");
                var key = c.entityAspect.getKey();
                ok(key, "missing key");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("raw odata with select", function () {
        var em = new EntityManager({ serviceName: testFns.ServiceName, metadataStore: new MetadataStore() });
        ok(em, "no em found");

        var query = "Customers?$filter=startswith(CompanyName, 'A') eq true&$select=CompanyName, Orders";
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.CompanyName);
                ok(Array.isArray(a.Orders));
                a.Orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("raw odata - server side include many - customer and orders", function () {
        if (!testFns.DEBUG_WEBAPI) return;
        stop();
        $.getJSON("api/NorthwindIBModel/CustomersAndOrders?&$top=3", function (data, status) {
            ok(data);
            var str = JSON.stringify(data, undefined, 4);
            testFns.output("Customers with orders");
            testFns.output(str);
            start();
        });
    });

    test("raw odata - server side include 1 - order and customer", function () {
        if (!testFns.DEBUG_WEBAPI) return;
        stop();
        $.getJSON("api/NorthwindIBModel/Orders?$top=10&filter=here", function (data, status) {
            ok(data);
            var str = JSON.stringify(data, undefined, 4);

            testFns.output("Orders with customers");
            testFns.output(str);
            start();
        });
    });

    test("WebApi metadata", function () {
        if (!testFns.DEBUG_WEBAPI) return;
        stop();
        $.getJSON("api/NorthwindIBModel/Metadata", function (data, status) {
            // On success, 'data' contains the model metadata.
            //                console.log(data);
            ok(data);
            var metadata = JSON.parse(data);
            var str = JSON.stringify(metadata, undefined, 4);
            testFns.output("Metadata");
            testFns.output(str);
            start();
        }).fail(testFns.handleFail);
    });

    return testFns;

});

