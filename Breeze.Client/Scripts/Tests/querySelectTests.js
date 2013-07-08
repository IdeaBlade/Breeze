(function (testFns) {
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
    
    module("query select", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });
    
    test("select - complex type", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Suppliers")
            .select(testFns.supplierKeyName + ", companyName, location")
            .where("location.city", "!=", null);  // added because NH returns null Location, when all Location properties are null
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.companyName);
                ok(a.location);
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("select - anon with jra & dateTimes", function () {
        if (testFns.DEBUG_ODATA) {
            ok(true, "Skipped tests - not written for OData (uses WebApi-jsonResultsAdapter)");
            return;
        };

        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - written specifically for webApi");
            return;
        }

        var em = newEm();
        var jra = new breeze.JsonResultsAdapter({
            name: "foo",

            visitNode: function (node) {
                if (node.$id) {
                    node.CreationDate = breeze.DataType.parseDateFromServer(node.CreationDate);
                    var dt = breeze.DataType.parseDateFromServer(node.ModificationDate);
                    if (!isNaN(dt.getTime())) {
                        node.ModificationDate = dt;
                    }
                }   
            }
        });
        var query = new EntityQuery()
            .from("UnusualDates")
            .where("creationDate", "!=", null)
            .select("creationDate, modificationDate")
            .take(3)
            .using(jra);
        
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var anons = data.results;
            ok(anons.length == 3, "should be three anon results");
            
            anons.forEach(function (a) {
                ok(core.isDate(a.creationDate), "creationDate should be a date");
                ok(core.isDate(a.modificationDate) || a.modificationDate == null, "modificationDate should be a date or null");
            });
        }).fail(testFns.handleFail).fin(start);

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
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("select - anon collection", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - requires join");
            return;
        }

        var em = newEm();

        var query = EntityQuery.from("Customers")
            .where("companyName", "startsWith", "C")
            .select("orders");
        if (testFns.DEBUG_ODATA) {
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
                a.orders.forEach(function (order) {
                    ok(order.entityType === orderType);
                });
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("select - anon simple, entity collection projection", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - requires join");
            return;
        }

        var em = newEm();

        var query = new EntityQuery("Customers")
            .where("companyName", "startsWith", "C")
            .orderBy("companyName")
            .select(["companyName", "orders"]);
        if (testFns.DEBUG_ODATA) {
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
                ok(Object.keys(a).length === 2, "should have 2 properties");
                ok(a.companyName);
                ok(Array.isArray(a.orders));
                a.orders.forEach(function (order) {
                    ok(order.entityType === orderType);
                });
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("select - anon simple, entity scalar projection", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - requires join");
            return;
        }

        var em = newEm();

        var query = EntityQuery
            .from("Orders")
            .where("customer.companyName", "startsWith", "C");
            // .orderBy("customer.companyName");  - problem for the OData Web api provider.
        if (testFns.DEBUG_WEBAPI) {
            query = query.select("customer.companyName, customer, orderDate");
        } else if (testFns.DEBUG_ODATA) {
            query = query.select("customer, orderDate");
            query = query.expand("customer");
        }
            
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var customerType = em.metadataStore.getEntityType("Customer");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function(a) {
                if (testFns.DEBUG_WEBAPI) {
                    ok(Object.keys(a).length === 3, "should have 3 properties");
                    ok(typeof(a.customer_CompanyName) === 'string', "customer_CompanyName is not a string");
                } else if (testFns.DEBUG_ODATA) {
                    ok(Object.keys(a).length === 2, "should have 2 properties");
                }
                ok(a.customer.entityType === customerType, "a.customer is not of type Customer");
                ok(a.orderDate !== undefined, "OrderDate should not be undefined");
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("select - anon two props", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - requires join");
            return;
        }

        var em = newEm();
        var query = EntityQuery
            .from("Products")
            .where("category.categoryName", "startswith", "S")
            .select("productID, productName");
        stop();
        em.executeQuery(query).then(function(data) {
            var r = data.results;
            ok(r.length > 0);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("select with expand should fail with good msg", function () {
        /*
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - requires expand");
            return;
        }
        */


        var em = newEm();
        var query = EntityQuery
            .from("Products")
            .where("category.categoryName", "startswith", "S")
            .expand("category")
            .select(testFns.productKeyName + ", productName");
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
        }).fail(function (e) {
            ok(e.message.indexOf("expand") >= 0);
        }).fin(start);
    });

})(breezeTestFns);