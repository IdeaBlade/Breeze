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
    
    module("query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });
    
    test("Can run two queries in parallel for fresh EM w/ empty metadataStore", 1, function () {
        var em = new breeze.EntityManager("api/NorthwindIBModel");
        var query = breeze.EntityQuery.from("Customers");
        var successCount = 0;
        stop();
        var prom1 = em.executeQuery(query).then(function() {
             return successCount++;
        }).fail(queryFailed);
        var prom2 = em.executeQuery(query).then(function() {
             return successCount++;
        }).fail(queryFailed);

        Q.all([prom1, prom2]).then(function () {
            ok(successCount === 2, "two queries should succeed");
        }).fail(queryFailed).fin(start);

        function queryFailed(error) {
            ok(false, "query failed when successCount is " + successCount +
                " with error message = " + error.message);
        }
    });

    
    test("numeric/string  query ", function () {
        var em = newEm();
        stop();
        var r;
        EntityQuery.from("Products").take(5).using(em).execute().then(function(data) {
            var id = data.results[0].getProperty("productID").toString();

            var query = new breeze.EntityQuery()
                .from("Products").where('productID', '==', id).take(5);
            query.using(em).execute().then(function(data2) {
                r = data2.results;
                ok(r.length == 1);
                query = new breeze.EntityQuery()
                    .from("Products").where('productID', '!=', id);
                return query.using(em).execute();
            }).then(function(data3) {
                r = data3.results;
                ok(r.length > 1);
                start();
            }).fail(function(e) {
                ok(false, e);
                start();
            });
        }).fail(testFns.handleFail);
    });
    

    test("scalar server query ", function() {
        var em = newEm();

        var query = EntityQuery.from("CustomerWithScalarResult")
            .using(em);
        stop();

        query.execute().then(function (data) {
            ok(data.results.length === 1, "should be 1 result");
        }).fail(testFns.handleFail).fin(start);
    });
    
    //test("scalar server query 2 ", function () {
    //    var em = newEm();

    //    var query = EntityQuery.from("CustomerWithScalarResult")
    //        .using(em)
    //        .take(5);
    //    stop();

    //    query.execute().then(function (data) {
    //        ok(data.results.length === 1, "should be 1 result");
    //    }).fail(testFns.handleFail).fin(start);
    //});
    
    test("http 404 error thrown on server ", function () {
        var em = newEm();

        var query = EntityQuery.from("CustomersWithHttpError")
            .using(em);
        stop();

        query.execute().then(function (data) {
            ok(false, "should not get here");
        }).fail(function (e) {
            ok(e.status == 404, "status should be 404");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query results notification", function () {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID)
            .using(em);
        stop();
        var arrayChangedCount = 0;
        var adds;
        var orders;
        query.execute().then(function (data) {
            var customer = data.results[0];
            orders = customer.getProperty("orders");
            orders.arrayChanged.subscribe(function(args) {
                arrayChangedCount++;
                adds = args.added;
            });
            return query.expand("orders").execute();
        }).then(function (data2) {
            ok(arrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(adds && adds.length > 0, "should have been multiple entities shown as added");
            var orderType = em.metadataStore.getEntityType("Order");
            var newOrder = orderType.createEntity();
            orders.push(newOrder);
            ok(arrayChangedCount === 2, "should have incremented by 1");
            ok(adds && adds.length === 1, "should have only a single entity added here");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query results notification suppressed", function () {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID)
            .using(em);
        stop();
        var arrayChangedCount = 0;
        var orders;

        query.execute().then(function (data) {
            var customer = data.results[0];
            orders = customer.getProperty("orders");
            orders.arrayChanged.subscribe(function (args) {
                arrayChangedCount++;
            });
//             Event.enable("arrayChanged", customer.entityAspect, false);
            Event.enable("arrayChanged", em, false);
            return query.expand("orders").execute();
        }).then(function (data2) {
            ok(arrayChangedCount == 0, "should be no arrayChanged events fired");
            var orderType = em.metadataStore.getEntityType("Order");
            var newOrder = orderType.createEntity();
            orders.push(newOrder);
            ok(arrayChangedCount == 0, "should be no arrayChanged events fired");
            
        }).fail(testFns.handleFail).fin(start);
    });

    test("getEntities after query", function() {
        var em = newEm();
        var query = breeze.EntityQuery.from("Categories");
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0); //this returns 45 results
            var ents = em.getEntities();
            ok(ents.length > 0); // this returns 0 results. WHY????
        }).fail(testFns.handleFail).fin(start);
        
    });
    

    
    test("navigation results notification", function () {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID)
            .using(em);
        stop();
        var arrayChangedCount = 0;
        var adds;
        var orders;
        query.execute().then(function (data) {
            var customer = data.results[0];
            orders = customer.getProperty("orders");
            orders.arrayChanged.subscribe(function (args) {
                arrayChangedCount++;
                adds = args.added;
            });
            return customer.entityAspect.loadNavigationProperty("orders");
        }).then(function (data2) {
            ok(arrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(adds && adds.length > 0, "should have been multiple entities shown as added");
            var orderType = em.metadataStore.getEntityType("Order");
            var newOrder = orderType.createEntity();
            orders.push(newOrder);
            ok(arrayChangedCount === 2, "should have incremented by 1");
            ok(adds && adds.length === 1, "should have only a single entity added here");
        }).fail(testFns.handleFail).fin(start);
    });

    test("query results include query", function() {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID)
            .using(em);
        stop();
        query.execute().then(function(data) {
            var customer = data.results[0];
            var sameQuery = data.query;
            ok(query === sameQuery, "not the same query");
        }).fail(testFns.handleFail).fin(start);
    });

    test("duplicates after relation query", function() {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID);
            // bug goes away if you add this.
            // .expand("orders");
        var customer;
        stop();
        query.using(em).execute().then(function(data) {
            customer = data.results[0];
            var q2 = EntityQuery.from("Orders")
                .where("customerID", "==", alfredsID)
                .expand("customer"); // bug goes away if you remove this
            return q2.using(em).execute();
        }).then(function(data2) {
            var details = customer.getProperty("orders");
            var dups = testFns.getDups(details);
            ok(dups.length == 0, "should be no dups");
        }).fail(testFns.handleFail).fin(start);
        
    });

    test("post create init after materialization", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Product = testFns.models.Product();
       
        var productType = em.metadataStore.getEntityType("Product");
        em.metadataStore.registerEntityTypeCtor("Product", Product, "init");
        var query = EntityQuery.from("Products").take(3);
        stop();
        em.executeQuery(query).then(function(data) {
            var products = data.results;
            products.forEach(function (p) {
                ok(p.getProperty("productName") !== undefined, "productName should be defined");
                ok(p.getProperty("isObsolete") === true,"isObsolete should be true");
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("post create init using materialized data", 2,function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Customer = testFns.models.Customer();
        
        var customerInitializer = function (customer) {
            // should be called after materialization ... but is not.
            var companyName = customer.getProperty("companyName");
            ok(companyName, "company name should not be null");
            customer.foo = "Foo " + companyName;
        };

        em.metadataStore.registerEntityTypeCtor("Customer", Customer, customerInitializer);
        
        var query = EntityQuery.from("Customers").top(1);

        stop(); // going async
        em.executeQuery(query).then(function (data) {
            var cust = data.results[0];
            equal(cust.foo, "Foo " + cust.getProperty("companyName"),
                "'foo' property, created in initializer, performed as expected");
        }).fail(testFns.handleFail).fin(start);
    });


    
    test("date property is a DateTime", function () {

        // This is what the type of a date should be
        var someDate = new Date();
        ok("object" === typeof someDate,
            "typeof someDate is " + typeof someDate);
    
        var firstOrderQuery = new EntityQuery("Orders")
            .where("orderDate", ">", new Date(1998, 3, 1))
            .take(1);

        var em = newEm();
        stop();
        em.executeQuery(firstOrderQuery).then(function (data) {
            var ents = em.getEntities();
            var order = data.results[0];
            var orderDate = order.getProperty("orderDate");

            // THIS TEST FAILS!
            ok("object" === typeof orderDate,
                "typeof orderDate is " + typeof orderDate);
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
        customer.setProperty("companyName","[don't know name yet]");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        em.attachEntity(customer);
        customer.setProperty("customerID", alfredsID); 
        var ek = customer.entityAspect.getKey();
        var sameCustomer = em.findEntityByKey(ek);
        ok(customer === sameCustomer, "customer should == sameCustomer");
    });
    
    test("reject change to existing key", function() {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers").where("customerID", "==", alfredsID);
        stop();
        query.using(em).execute().then(function(data) {        
            ok(data.results.length === 1,"should have fetched 1 record");
            var customer = custType.createEntity();        
            em.attachEntity(customer);
            try {
                customer.setProperty("customerID", alfredsID); 
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
        customer.setProperty("companyName","[don't know name yet]");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        // TEST PASSES (NO DUPLICATE) IF SET ID HERE ... BEFORE ATTACH
        // customer.CustomerID(testFns.wellKnownData.alfredsID); // 785efa04-cbf2-4dd7-a7de-083ee17b6ad2

        em.attachEntity(customer);

        // TEST FAILS  (2 IN CACHE W/ SAME ID) ... CHANGING THE ID AFTER ATTACH
        customer.setProperty("customerID", alfredsID); // 785efa04-cbf2-4dd7-a7de-083ee17b6ad2
        var ek = customer.entityAspect.getKey();
        var sameCustomer = em.findEntityByKey(ek);
        customer.entityAspect.setUnchanged();
        
        // SHOULD BE THE SAME. EITHER WAY ITS AN ATTACHED UNCHANGED ENTITY
        ok(customer.entityAspect.entityState.isUnchanged,
            "Attached entity is in state " + customer.entityAspect.entityState);

        ok(em.getEntities().length === 1,
            "# of entities in cache is " + em.getEntities().length);

        // this refresh query will fill the customer values from remote storage
        var refreshQuery = breeze.EntityQuery.fromEntities(customer);

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
                            c1.getProperty("customerID"), c1.getProperty("companyName"), c2.getProperty("customerID"), c2.getProperty("companyName")));
                }

                // This test should succeed; it fails because of above bug!!!
                ok(results[0] === customer,
                    "refresh query result is the same as the customer in cache" +
                        " whose updated name is " + customer.getProperty("companyName"));
            }
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
            var terrs = region.getProperty("territories");
            return terrs.load();
        }).then(function (data2) {
            ok(data2.results.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

    

    test("starts with op", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("companyName", "startsWith", "C")
            .orderBy("companyName");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function (data) {
            var customers = data.results;
            testFns.assertIsSorted(customers, "companyName", false, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), 'should have a companyName property');
                var key = c.entityAspect.getKey();
                ok(key, "missing key");
                var c2 = em.findEntityByKey(key);
                ok(c2 === c, "entity not cached");
            });
            start();
        }).fail(testFns.handleFail);
    });

    asyncTest("greater than op", function () {
        var em = newEm();

        var query = EntityQuery.from("Orders")
            .where("freight", ">", 100);

        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

   
    asyncTest("predicate", function () {
        var em = newEm();

        var baseQuery = EntityQuery.from("Orders");
        var pred1 = new Predicate("freight", ">", 100);
        var pred2 = new Predicate("orderDate", ">", new Date(1998, 3, 1));
        var query = baseQuery.where(pred1.and(pred2));
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

    test("predicate with contains", function() {
        var em = newEm();

        var p1 = Predicate.create("companyName", "startsWith", "S");
        var p2 = Predicate.create("city", "contains", "er");
        var whereClause = p1.and(p2);

        var query = new breeze.EntityQuery()
            .from("Customers")
            .where(whereClause);
        stop();
        em.executeQuery(query).then(function(data) {
            var customers = data.results;
            ok(customers.length > 0);
            start();
        }).fail(testFns.handleFail);
    });
    
     asyncTest("predicate 2", function () {
        var em = newEm();

        var baseQuery = EntityQuery.from("Orders");
        var pred1 = Predicate.create("freight", ">", 100);
        var pred2 = Predicate.create("orderDate", ">", new Date(1998, 3, 1));
        var newPred = Predicate.and([pred1, pred2]);
        var query = baseQuery.where(newPred);
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var orders = data.results;
            ok(orders.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

    test("predicate 3", function () {
        var em = newEm();

        var baseQuery = EntityQuery.from("Orders");
        var pred = Predicate.create("freight", ">", 100)
            .and("orderDate", ">", new Date(1998, 3, 1));
        var query = baseQuery.where(pred);
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var orders = data.results;
            ok(orders.length > 0);
        }).fail(testFns.handleFail).fin(start);
    });



    test("not predicate with null", function () {
        var em = newEm();

        var pred = new Predicate("region", FilterQueryOp.Equals, null);
        pred = pred.not();
        var query = new EntityQuery()
            .from("Customers")
            .where(pred)
            .take(10);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 0);
            customers.forEach(function (customer) {
                var region = customer.getProperty("region");
                ok(region != null, "region should not be either null or undefined");
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("unidirectional navigation load", function() {
        var em = newEm();
        var count = 5;
        var query = EntityQuery.from("OrderDetails").take(count);
        stop();
        query.using(em).execute().then(function(data) {
            var orderDetails = data.results;
            ok(orderDetails.length == count);
            orderDetails.forEach(function(od) {
                od.entityAspect.loadNavigationProperty("product").then(function (data2) {
                    var products = data2.results;
                    ok(products.length === 1, "should only return a single product");
                    count--;
                    if (count === 0) start();
                });
            });
        }).fail(testFns.handleFail);
    });
    
    test("unidirectional navigation query", function () {
        var em = newEm();
        
        var query = EntityQuery.from("OrderDetails")
            .where("product.productID", "==", 1);
        stop();
        query.using(em).execute().then(function (data) {
            var orderDetails = data.results;
            ok(orderDetails.length > 0);
            orderDetails.forEach(function (od) {
                ok(od.getProperty("productID") === 1, "productID should === 1");
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("unidirectional navigation bad query", function () {
        var em = newEm();

        var query = EntityQuery.from("Products")
            .where("productID", "==", 1)
            .expand("orderDetails");

        stop();
        query.using(em).execute().then(function(data) {
            ok(false, "should not get here");
            start();
        }).fail(function (err) {
            if (testFns.DEBUG_WEBAPI) {
                ok(err.message.indexOf("OrderDetails") >= 1, " message should be about missing OrderDetails property");
            } else {
                ok(err.message.indexOf("Product") >= 1, "should be an error message about the Product query");
            }
            start();
        });
    });


    test("fromEntities", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .take(2);
        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length == 2, "data.results length should be 2");
            var q2 = EntityQuery.fromEntities(orders);
            return q2.execute();
        }).then(function (data2) {
            ok(data2.results.length == 2, "data.results length should be 2");
        }).fail(testFns.handleFail).fin(start);
    });

    test("where nested property", function () {
        var em = newEm();

        var query = new EntityQuery()
             .from("Products")
             .where("category.categoryName", "startswith", "S")
             .expand("category");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("category");
            });
            cats.forEach(function(cat) {
                var catName = cat.getProperty("categoryName");
                ok(core.stringStartsWith(catName, "S"));
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("where nested property 2", function () {
        var em = newEm();

         var query = new EntityQuery()
             .from("Orders")
             .where("customer.region", "==", "CA");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var customers = data.results;
            ok(customers.length > 0, "some customers should have been found");
            start();
        }).fail(testFns.handleFail);
    });

    test("orderBy", function () {
        var em = newEm();

        var query = new EntityQuery("Products")
            .orderBy("productName desc")
            .take(5);
        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var productName = products[0].getProperty("productName");
            testFns.assertIsSorted(products, "productName", true,  em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
            start();
        }).fail(testFns.handleFail);
    });

    test("expand", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Products");

        query = query.expand("category")
            .take(5);
        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = [];
            products.map(function (product) {
                var cat = product.getProperty("category");
                if (cat) {
                    cats.push(cats);
                }
            });
            ok(cats.length == 5, "should have 5 categories");

            start();
        }).fail(testFns.handleFail);
    });

    test("expand multiple", function() {
        var em = newEm();

        var query = new EntityQuery("Orders");

        query = query.expand("customer, employee")
            .take(20);
        stop();
        em.executeQuery(query).then(function(data) {
            var orders = data.results;
            var custs = [];
            var emps = [];
            orders.map(function(order) {
                var cust = order.getProperty("customer");
                if (cust) {
                    custs.push(cust);
                }
                var emp = order.getProperty("employee");
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
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders");

        query = query.expand("customer, orderDetails, orderDetails.product")
            .take(5);
        stop();
        em.executeQuery(query).then(function(data) {
            var orders = data.results;
            var custs = [];
            var orderDetails = [];
            var products = [];
            orders.map(function(order) {
                var cust = order.getProperty("customer");
                if (cust) {
                    custs.push(cust);
                }
                var orderDetailItems = order.getProperty("orderDetails");
                if (orderDetailItems) {
                    Array.prototype.push.apply(orderDetails, orderDetailItems);
                    orderDetailItems.map(function(orderDetail) {
                        var product = orderDetail.getProperty("product");
                        if (product) {
                            products.push(product);
                        }
                    });
                }
            });
            ok(custs.length == 5, "should have 5 customers");
            ok(orderDetails.length > 5, "should have > 5 orderDetails");
            ok(products.length > 5, "should have > 5 products");
        }).fail(function(e) {
            testFns.handleFail(e);
        }).fin(start);
            
    });

    test("orderBy nested", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Products")
            .orderBy("category.categoryName desc")
            .expand("category");

        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("category");
            });

            testFns.assertIsSorted(cats, "categoryName", true, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
            start();
        }).fail(testFns.handleFail);
    });

    test("orderBy two part nested", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Products")
            .orderBy("category.categoryName desc, productName")
            .expand("category");

        stop();
        em.executeQuery(query).then(function (data) {
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("category");
            });

            testFns.assertIsSorted(cats, "categoryName", true, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
            start();
        }).fail(testFns.handleFail);
    });

    test("skiptake", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Products")
            .orderBy("productName");
        var sc = new testFns.StopCount(3);
        var skipTakeCount = 5;
        em.executeQuery(query, function (data) {
            var products = data.results;

            var newq1 = query.skip(skipTakeCount);
            var newq1Url = newq1._toUri(em.metadataStore);
            em.executeQuery(newq1, function (data1) {
                var custs1 = data1.results;
                equal(custs1.length, products.length - skipTakeCount);
                sc.start();
            }).fail(testFns.handleFail);

            var newq2 = query.take(skipTakeCount);
            var newq2Url = newq1._toUri(em.metadataStore);
            em.executeQuery(newq2, function (data2) {
                var custs2 = data2.results;
                equal(custs2.length, skipTakeCount);
                sc.start();
            }).fail(testFns.handleFail);

            var newq3 = query.skip(skipTakeCount).take(skipTakeCount);
            var newq3Url = newq1._toUri(em.metadataStore);
            em.executeQuery(newq3, function (data3) {
                var custs3 = data3.results;
                equal(custs3.length, skipTakeCount);
                sc.start();
            }).fail(testFns.handleFail);

        }).fail(testFns.handleFail);
    });

    asyncTest("query expr - toLower", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("toLower(companyName)", "startsWith", "c");
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var name = cust.getProperty("companyName").toLowerCase();
                return core.stringStartsWith(name, "c");
            }), "every cust should startwith a 'c'");
            start();
        }).fail(testFns.handleFail);
    });
    
    test("query expr - toUpper/substring", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("toUpper(substring(companyName, 1, 2))", "startsWith", "OM");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var val= cust.getProperty("companyName").substr(1,2).toUpperCase();
                return val == "OM";
            }), "every cust should have 'OM' as the 2nd and 3rd letters");
            start();
        }).fail(testFns.handleFail);
    });
    
    test("query expr - length", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("length(companyName)", ">", 20);
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var val = cust.getProperty("companyName");
                return val.length > 20;
            }), "every cust have a name longer than 20 chars");
            start();
        }).fail(testFns.handleFail);
    });
    
    test("query expr - navigation then length", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("length(customer.companyName)", ">", 30)
            .expand("customer");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var orders = data.results;
            ok(orders.length > 0);
            ok(orders.every(function(order) {
                var cust = order.getProperty("customer");
                var val = cust.getProperty("companyName");
                return val.length > 30;
            }), "every order must have a cust with a name longer than 30 chars");
            start();
        }).fail(testFns.handleFail);
    });
    
    test("bad query expr -  bad property name", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("length(customer.fooName)", ">", 30);
        // var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            ok(false, "should not get here");
            start();
        }, function (error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("fooName") > 0, "bad message");
            error.handled = true;
            start();
        }).fail(testFns.handleFail);
    });
    
  
    
    test("bad filter operator", function () {
        var em = newEm();

         try {
            var query = new EntityQuery()
            .from("Customers")
            .where("companyName", "startsXWith", "C");
            ok(false, "shouldn't get here");
        } catch (error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("startsXWith") > 0, "bad message");
        }
    });   

    asyncTest("bad filter property", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("badCompanyName", "startsWith", "C");
        // var queryUrl = query._toUri(em.metadataStore);

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
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("companyName", FilterQueryOp.StartsWith, "C")
            .orderBy("badCompanyName");
        // var queryUrl = query._toUri(em.metadataStore);

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
        var empType = em.metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            ok(emp.getProperty("employeeID") === 1);
            start();
            return;
        }).fail(testFns.handleFail);

    });

    test("by EntityQuery.fromEntityNavigation  - (-> n) ", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        var orderType = em.metadataStore.getEntityType("Order");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            ok(emp.getProperty("employeeID") === 1);
            var np = emp.entityType.getProperty("orders");
            var q2 = EntityQuery.fromEntityNavigation(emp, np);
            em.executeQuery(q2, function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType === orderType; }));
                var orders = emp.getProperty("orders");
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
            var np = order.entityType.getProperty("employee");
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
        var empType = em.metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            emp.entityAspect.loadNavigationProperty("orders", function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType.shortName = "Order"; }));
                var orders = emp.getProperty("orders");
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
            var emp = order.getProperty("employee");
            ok(emp === null, "emp should start null");
            return order.entityAspect.loadNavigationProperty("employee");
        }).then(function (data2) {
            ok(data2.results.length === 1, "wrong amount of data returned");
            ok(data2.results[0].entityType.shortName === "Employee");
            var sameEmp = order.getProperty("employee");
            ok(data2.results[0] === sameEmp, "query results do not match nav results");
            var orders = sameEmp.getProperty("orders");
            var ix = orders.indexOf(order);
            ok(ix >= 0, "can't find order in reverse lookup");
            start();
        }).fail(testFns.handleFail);

    });

    test("load from navigationProperty value.load (-> n)", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        var orderType = em.metadataStore.getEntityType("Order");
        var entityKey = new EntityKey(empType, 1);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query, function (data) {
            var emp = data.results[0];
            var orders = emp.getProperty("orders");
            ok(orders.length === 0, "orders length should start at 0");
            orders.load(function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType === orderType; }));
                ok(orders.length == data2.results.length, "local array does not match queried results");
                start();
            }).fail(testFns.handleFail);
        }).fail(testFns.handleFail);

    });


    test("WebApi metadata", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "NA for OData impl");
            return;
        }
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

