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

    var newEm = testFns.newEm;
    
    module("query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
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
        var Product = function () {
            this.isObsolete = false;
        };
        Product.prototype.init = function (entity) {
            ok(entity.entityType === productType, "entity's productType should be 'Product'");
            ok(entity.getProperty("isObsolete") === false, "should not be obsolete");
            entity.setProperty("isObsolete", true);
        };
       
        var productType = em.metadataStore.getEntityType("Product");
        em.metadataStore.registerEntityTypeCtor("Product", Product, "init");
        var query = EntityQuery.from("Products").take(3);
        stop();
        em.executeQuery(query).then(function(data) {
            var products = data.results;
            products.forEach(function(p) {
                ok(p.getProperty("isObsolete") === true,"isObsolete should be true");
            });
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
        em.executeQuery(firstOrderQuery).then(function(data) {
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
            start();
        }).fail(testFns.handleFail);
              
    });

    test("named query", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "OData does not support named queries like 'CustomersStartingWithA'");
            return;
        }
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersStartingWithA");
        var queryUrl = query._toUri(em.metadataStore);
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
            var terrs = region.getProperty("territories");
            return terrs.load();
        }).then(function (data2) {
            ok(data2.results.length > 0);
            start();
        }).fail(testFns.handleFail);
    });

    
    test("select - anon simple", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("companyName", "startsWith", "C")
            .select("companyName");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.companyName);
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select - anon collection", function () {
        var em = newEm();

        var query = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "C")
            .select("orders");
        if (!testFns.DEBUG_WEBAPI) {
            query = query.expand("orders");
        }
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(Array.isArray(a.orders));
                a.orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("select - anon simple, entity collection projection", function () {
        var em = newEm();

        var query = new EntityQuery("Customers")
            .where("companyName", "startsWith", "C")
            .orderBy("companyName")
            .select("companyName, orders");
        if (!testFns.DEBUG_WEBAPI) {
            query = query.expand("orders");
        }        
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(Object.keys(a).length === 2,"should have 2 properties");
                ok(a.companyName);
                ok(Array.isArray(a.orders));
                a.orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("select - anon simple, entity scalar projection", function () {
        
        var em = newEm();
        
        var query = EntityQuery
            .from("Orders")
            .where("customer.companyName", "startsWith", "C")
            .orderBy("customer.companyName");
        if (testFns.DEBUG_WEBAPI) {
            query = query.select("customer.companyName, customer, orderDate");
        } else {
            query = query.select("customer, orderDate");
            query = query.expand("customer");
        }
            
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var customerType = em.metadataStore.getEntityType("Customer");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                if (testFns.DEBUG_WEBAPI) {
                    ok(Object.keys(a).length === 3, "should have 3 properties");
                    ok(typeof(a.customer_CompanyName) === 'string', "customer_CompanyName is not a string");
                } else {
                    ok(Object.keys(a).length === 2, "should have 2 properties");
                }
                ok(a.customer.entityType === customerType, "a.customer is not of type Customer");
                ok(a.orderDate !== undefined, "OrderDate should not be undefined");
            });
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
            testFns.assertIsSorted(customers, "companyName");
            customers.forEach(function (c) {
                ok(c.companyName, 'should have a companyName property');
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

        var query = EntityQuery.from("Product")
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
            return em.executeQuery(q2);
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
            testFns.assertIsSorted(products, "productName", false);
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

            testFns.assertIsSorted(cats, "categoryName", true);
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

            testFns.assertIsSorted(cats, "categoryName", true);
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
    
    test("bad odata expr", function () {
        stop();

        var em = newEm();
        var query = "Customers?$filter=starxtswith(CompanyName, 'A') eq true&$orderby=CompanyName desc";

        em.executeQuery(query).fail(function (error) {
            ok(error instanceof Error, "should be an error");
            ok(error.message.indexOf("starxtswith") > -1, "error message has wrong text");
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

    asyncTest("local query", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("freight", ">=", 500);


        em.executeQuery(query, function (data) {
            var orders = data.results;
            var ordersL = em.executeQueryLocally(query);
            ok(core.arrayEquals(orders, ordersL), "local query should return same result as remote query");
            var orders2 = em.executeQueryLocally(query2);
            ok(orders2.length > 0);
            ok(orders2.length < orders.length);
            ok(orders2.every(function (o) { return o.getProperty("freight") >= 500; }));
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("local query - fetchStrategy", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("freight", ">", 100);

        var query2 = new EntityQuery()
            .from("Orders")
            .where("freight", ">=", 500);

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
            ok(orders2.every(function(o) { return o.getProperty("freight") >= 500; }));
            start();
        }).fail(testFns.handleFail);
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
            return query.using(entityModel.FetchStrategy.FromLocalCache).execute();
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

    test("server side include many with filter - customers and orders", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "Not supported with OData");
            return;
        } 
        stop();
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("companyName", "startsWith", "A")
            .orderBy("companyName")
            .take(4);
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 2, "no customers found");
            testFns.assertIsSorted(customers, "companyName");
            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), 'should have a companyName property');
                var orders = c.getProperty("orders");
                ok(orders.length > 0, "orders should be populated");
                var matchingCust = orders[0].getProperty("customer");
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
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "Not supported with OData");
            return;
        } 
        expect(5);
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("companyName", FilterQueryOp.StartsWith, "C")
            .take(1);

        var sc = new testFns.StopCount(2);

        em.executeQuery(query, function (data) {

            ok(data.results.length === 1, "query should only return a single cust");
            var cust = data.results[0];
            var custKey = cust.entityAspect.getKey();
            var orders = cust.getProperty("orders");
            var orderKeys = orders.map(function (o) { return o.entityAspect.getKey(); });
            var custQuery = EntityQuery.fromEntities(cust);

            var ordersQuery = EntityQuery.fromEntities(orders);
            var em2 = newEm();

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
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "Not supported with OData");
            return;
        } 
        stop();
        var em = newEm();

        var query = new EntityQuery()
            .from("CustomersAndOrders")
            .where("companyName", "startsWith", "A")
            .orderBy("companyName")
            .take(4);
        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query).then(function (data) {
            var customers = data.results;
            ok(customers.length == 4, "wrong number of customers");

            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), 'should have a companyName property');
                var orders = c.getProperty("orders");
                ok(orders.length > 0, "Orders should be populated");
                var matchingCust = orders[0].getProperty("customer");
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
        var em = newEm(testFns.newMs());
        ok(em, "no em found");

        var query = "Customers?$filter=startswith(CompanyName, 'A') eq true&$orderby=CompanyName desc&$expand=Orders";
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var customers = data.results;
            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), "missing companyName property");
                var key = c.entityAspect.getKey();
                ok(key, "missing key");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("raw odata with select", function () {
        var em = newEm(testFns.newMs());
        ok(em, "no em found");
        
        var query = "Customers?$filter=startswith(CompanyName, 'A') eq true&$select=CompanyName, Orders";
        if (!testFns.DEBUG_WEBAPI) {
            query = query + "&$expand=Orders";
        }
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.companyName);
                ok(Array.isArray(a.orders));
                a.orders.forEach(function(order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("raw odata - server side include many - customer and orders", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "NA for OData impl");
            return;
        }
        stop();
        try {
            $.getJSON("api/NorthwindIBModel/CustomersAndOrders?&$top=3", function(data, status) {
                ok(data);
                var str = JSON.stringify(data, undefined, 4);
                testFns.output("Customers with orders");
                testFns.output(str);
                start();
            });
        } catch (e) {
            testFns.handleFail(e);
        }
    });

    test("raw odata - server side include 1 - order and customer", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "NA for OData impl");
            return;
        }
        stop();
        try {
            $.getJSON("api/NorthwindIBModel/Orders?$top=10&filter=here", function(data, status) {
                ok(data);
                var str = JSON.stringify(data, undefined, 4);

                testFns.output("Orders with customers");
                testFns.output(str);
                start();
            });
        } catch (e) {
            testFns.handleFail(e);
        }
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

