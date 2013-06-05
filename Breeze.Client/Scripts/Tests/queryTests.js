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

    module("query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    test("getAlfred", function () {
        var em = newEm();
        var q = EntityQuery.from("Customers").where("companyName", "startsWith", "Alfreds");
        stop();
        em.executeQuery(q).then(function (data) {
            var alfred = data.results[0];
            var alfredsID = alfred.getProperty(testFns.customerKeyName);
            ok(alfredsID === wellKnownData.alfredsID);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query URL malformed with bad resource name combined with 'startsWith P'", function () {
        var em = newEm();
        // we intentionally mispelled the resource name to cause the query to fail
        var q = EntityQuery.from("Customer").where("companyName", "startsWith", "P");
        stop();
        em.executeQuery(q).then(function (data) {
            ok(true);
        }).fail(function (error) {
            if (testFns.DEBUG_MONGO) {
                ok(error.message.indexOf("Unable to locate") >= 0, "Bad error message");
            } else {
                ok(error.message.indexOf("No HTTP resource was found") >= 0, "Bad error message");
            }
        }).fin(start);
    });

    test("raw query string", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - needs a toType for MONGO");
            return;
        }

        var em = newEm();
        var q = ""
        stop();
        em.executeQuery("Customers?&$top=3").then(function (data) {
            var custs = data.results;
            ok(custs.length === 3, "should be 3 custs");
            var isOk = custs.every(function (c) {
                return c.entityType.shortName === "Customer";
            });
            ok(isOk, "all results should be customers");
        }).fail(testFns.handleFail).fin(start);
    });

    test("query with take, orderby and expand", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }
        var em = newEm();
        var q1 = EntityQuery.from("Products")
            .expand("category")
            .orderBy("category.categoryName desc, productName");
        stop();
        var topTen;
        em.executeQuery(q1).then(function (data) {
            topTen = data.results.slice(0, 10);
            var q2 = q1.take(10);
            return em.executeQuery(q2);
        }).then(function (data2) {
            var topTenAgain = data2.results;
            for(var i=0; i<10; i++) {
                ok(topTen[i] === topTenAgain[i]);
            }
        }).fail(testFns.handleFail).fin(start);

    });

    test("query with take, skip, orderby and expand", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        var q1 = EntityQuery.from("Products")
            .expand("category")
            .orderBy("category.categoryName, productName");
        stop();
        var nextTen;
        em.executeQuery(q1).then(function (data) {
            nextTen = data.results.slice(10, 20);
            var q2 = q1.skip(10).take(10);
            return em.executeQuery(q2);
        }).then(function (data2) {
            var nextTenAgain = data2.results;
            for (var i = 0; i < 10; i++) {
                ok(nextTen[i] === nextTenAgain[i], extractDescr(nextTen[i]) + " -- " + extractDescr(nextTenAgain[i]));
            }
        }).fail(testFns.handleFail).fin(start);

    });

    function extractDescr(product) {
        var cat =  product.getProperty("category");
        return cat && cat.getProperty("categoryName") + ":" + product.getProperty("productName");
    }

    test("query with quotes", function () {
        var em = newEm();

        var q = EntityQuery.from("Employees")
            .where("firstName", 'contains', "abc''defg")
            .using(em);
        stop();

        q.execute().then(function (data) {
            ok(data.results.length === 0);
            var r = em.executeQueryLocally(q);
            ok(r.length === 0);
        }).fail(testFns.handleFail).fin(start);
            
    });

    test("bad query test", function () {
        var em = newEm();
        
        var q = EntityQuery.from("EntityThatDoesnotExist")
            .using(em);
        stop();

        q.execute().then(function (data) {
            ok(false, "should not get here");
        }).fail(function (e) {
            ok(e.message && e.message.toLowerCase().indexOf("entitythatdoesnotexist") >= 0, e.message);
        }).fin(function(x) {
            start();
        });
    });

    test("nested expand", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        var em2 = newEm();
        var query = EntityQuery.from("OrderDetails").take(5).expand("order.customer");
        stop();

        em.executeQuery(query).then(function (data) {
            var details = data.results;
            var order = details[0].getProperty("order");
            ok(order, "should have found an order");
            var customer = order.getProperty("customer");
            ok(customer, "should have found a customer");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query using jsonResultsAdapter", function () {
        if (testFns.DEBUG_ODATA) {
            ok(true, "Skipped tests - OData with jsonResultsAdapter");
            return;
        }

        if (testFns.DEBUG_MONGO) {
            ok(true, "Skipped tests - Mongo with jsonResultsAdapter");
            return;
        }

        var em = newEm();
        var jsonResultsAdapter = new breeze.JsonResultsAdapter({
            name: "eventAdapter",
            extractResults: function (json) {
                return json.results;
            },
            visitNode: function (node, mappingContext, nodeContext) {
                var entityTypeName = 'OrderDetail';
                var entityType = entityTypeName && mappingContext.entityManager.metadataStore.getEntityType(entityTypeName, true);
                var propertyName = nodeContext.propertyName;
                var ignore = propertyName && propertyName.substr(0, 1) === "$";
                if (entityType) {
                    node.RowVersion = 77;
                }
                return {
                    entityType: entityType,
                    nodeId: node.$id,
                    nodeRefId: node.$ref,
                    ignore: ignore
                };
            }
        });
        var query = EntityQuery.from("OrderDetails").take(5).using(jsonResultsAdapter);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length === 5, "should be 5 recs");
            var rv = data.results[0].getProperty("rowVersion");
            ok(rv === 77, "rowVersion should be 77");
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("query using dataService with jsonResultsAdapter", function () {
        if (testFns.DEBUG_ODATA) {
            ok(true, "Skipped tests - OData with jsonResultsAdapter");
            return;
        }

        if (testFns.DEBUG_MONGO) {
            ok(true, "Skipped tests - Mongo with jsonResultsAdapter");
            return;
        }

        var em = newEm();
        
        var jsonResultsAdapter = new breeze.JsonResultsAdapter({
            name: "eventAdapter",
            extractResults: function (json) {
                return json.results;
            },
            visitNode: function (node, mappingContext, nodeContext) {
                var entityTypeName = 'OrderDetail';
                var entityType = entityTypeName && mappingContext.entityManager.metadataStore.getEntityType(entityTypeName, true);
                var propertyName = nodeContext.propertyName;
                var ignore = propertyName && propertyName.substr(0, 1) === "$";
                if (entityType) {
                    node.RowVersion = 77;
                }
                return {
                    entityType: entityType,
                    nodeId: node.$id,
                    nodeRefId: node.$ref,
                    ignore: ignore
                };
            }
        });
        var oldDs = em.dataService;
        var newDs = new DataService({ serviceName: oldDs.serviceName, jsonResultsAdapter: jsonResultsAdapter });
        var query = EntityQuery.from("OrderDetails").take(5).using(newDs);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(data.results.length === 5, "should be 5 recs");
            var rv = data.results[0].getProperty("rowVersion");
            ok(rv === 77, "rowVersion should be 77");
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("query using em with dataService with jsonResultsAdapter", function () {
        if (testFns.DEBUG_ODATA) {
            ok(true, "Skipped tests - OData with jsonResultsAdapter");
            return;
        }

        if (testFns.DEBUG_MONGO) {
            ok(true, "Skipped tests - Mongo with jsonResultsAdapter");
            return;
        }

        var em = newEm();

        var jsonResultsAdapter = new breeze.JsonResultsAdapter({
            name: "eventAdapter",
            extractResults: function (json) {
                return json.results;
            },
            visitNode: function (node, mappingContext, nodeContext) {
                var entityTypeName = 'OrderDetail';
                var entityType = entityTypeName && mappingContext.entityManager.metadataStore.getEntityType(entityTypeName, true);
                var propertyName = nodeContext.propertyName;
                var ignore = propertyName && propertyName.substr(0, 1) === "$";
                if (entityType) {
                    node.RowVersion = 77;
                }
                return {
                    entityType: entityType,
                    nodeId: node.$id,
                    nodeRefId: node.$ref,
                    ignore: ignore
                };
            }
        });
        var oldDs = em.dataService;
        var newDs = new DataService({ serviceName: oldDs.serviceName, jsonResultsAdapter: jsonResultsAdapter });
        var em2 = new EntityManager({ dataService: newDs });
        var query = EntityQuery.from("OrderDetails").take(5);
        stop();
        em2.executeQuery(query).then(function (data) {
            ok(data.results.length === 5, "should be 5 recs");
            var rv = data.results[0].getProperty("rowVersion");
            ok(rv === 77, "rowVersion should be 77");
        }).fail(testFns.handleFail).fin(start);

    });

    test("size test", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - uses expand");
            return;
        }
        var em = newEm();
        var em2 = newEm();
        var query = EntityQuery.from("Customers").take(5).expand("orders");
        stop();
        var s1, s2, s3, s4, s5, s6;
        var sizeDif;
        em.executeQuery(query).then(function(data) {
            s1 = testFns.sizeOf(em);
            return em.executeQuery(query);
        }).then(function(data2) {
            s2 = testFns.sizeOf(em);
            em.clear();
            s3 = testFns.sizeOf(em);
            sizeDif = testFns.sizeOfDif(s2, s3);
            ok(sizeDif, "should be a sizeDif");
            return em.executeQuery(query);
        }).then(function(data3) {
            s4 = testFns.sizeOf(em);
            ok(s1.size === s4.size, "sizes should be equal");
            em2 = newEm();
            return em2.executeQuery(query);
        }).then(function (data4) {
            s5 = testFns.sizeOf(em2);
            sizeDif = testFns.sizeOfDif(s1, s5);
            if (sizeDif) {
                ok(false, "sizes should be equal");
            }
            em2.clear();
            s6 = testFns.sizeOf(em2);
            sizeDif = testFns.sizeOfDif(s3, s6);
            if (sizeDif) {
                ok(false, "empty sizes should be equal");
            }
            
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("sizeof config", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - uses expand");
            return;
        }

        var em = newEm();
        var em2 = newEm();
        var query = EntityQuery.from("Customers").take(5).expand("orders");
        stop();
        var s1, s2, s3, s4, s5, s6;
        var sizeDif;
        em.executeQuery(query).then(function (data) {
            s1 = testFns.sizeOf(breeze.config);
            return em.executeQuery(query);
        }).then(function (data2) {
            s2 = testFns.sizeOf(breeze.config);
            em.clear();
            s3 = testFns.sizeOf(breeze.config);
            return em.executeQuery(query);
        }).then(function (data3) {
            s4 = testFns.sizeOf(breeze.config);
            ok(s1.size === s4.size, "sizes should be equal");
            em2 = newEm();
            s5 = testFns.sizeOf(breeze.config);
            return em2.executeQuery(query);
        }).then(function (data4) {
            s6 = testFns.sizeOf(breeze.config);
            ok(s5.size === s6.size, "sizes should be equal");
            em2 = newEm();
            return em2.executeQuery(query);


        }).fail(testFns.handleFail).fin(start);
    });
    
    test("size test property change", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        var em2 = newEm();
        var query = EntityQuery.from("Customers").take(5).expand("orders");
        stop();
        var s1, s2, s3, s4, s5, s6;
        var sizeDif; 
        var hasChanges = em.hasChanges();
        
        em.entityChanged.subscribe(function(x) {
            var y = x;
        });
        em2.entityChanged.subscribe(function (x) {
            var y = x;
        });

        em.executeQuery(query).then(function (data) {
            s1 = testFns.sizeOf(em);
            return em.executeQuery(query);
        }).then(function (data2) {
            var custs = data2.results;
            custs.forEach(function(c) {
                var rv = c.getProperty("rowVersion");
                c.setProperty("rowVersion", rv + 1);
            });
            em.rejectChanges();
            s2 = testFns.sizeOf(em);
            sizeDif = testFns.sizeOfDif(s1, s2);
            ok(Math.abs(sizeDif.dif) < 20, "s12 dif should be very small");
            em.clear();
            s3 = testFns.sizeOf(em);
            sizeDif = testFns.sizeOfDif(s2, s3);
            ok(sizeDif, "should be a sizeDif");
            return em.executeQuery(query);
        }).then(function (data3) {
            s4 = testFns.sizeOf(em);
            ok(Math.abs(s1.size - s4.size) < 20, "sizes should be equal");
            return em2.executeQuery(query);
        }).then(function (data4) {
            s5 = testFns.sizeOf(em2);
            sizeDif = testFns.sizeOfDif(s1, s5);
            if (sizeDif > 20) {
                ok(false, "sizes should be almost equal");
            }
            em2.clear();
            s6 = testFns.sizeOf(em2);
            sizeDif = testFns.sizeOfDif(s3, s6);
            if (sizeDif > 20) {
                ok(false, "empty sizes should be almost equal");
            }

        }).fail(testFns.handleFail).fin(start);
    });
    
    test("detached unresolved children", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var realEm = newEm();
        var metadataStore = realEm.metadataStore; 
        var orderType = metadataStore.getEntityType("Order"); 
     
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", "729de505-ea6d-4cdf-89f6-0360ad37bde7")
            .expand("orders");
        var newOrder = orderType.createEntity(); // call the factory function for the Customer type
        realEm.addEntity(newOrder);
        newOrder.setProperty("customerID", "729de505-ea6d-4cdf-89f6-0360ad37bde7");

        var items = realEm.rejectChanges();
        stop();
        realEm.executeQuery(query).then(function (data) {
            var orders = data.results[0].getProperty("orders");
            // the bug was that this included the previously detached order above. ( making a length of 11).
            ok(orders.length === 10, "This customer must have 10 Orders");

            var newOrder = orderType.createEntity(); // call the factory function for the Customer type
            realEm.addEntity(newOrder);
            newOrder.setProperty("customerID", "729de505-ea6d-4cdf-89f6-0360ad37bde7");

            var items = realEm.rejectChanges();
            return realEm.executeQuery(query);

        }).then(function (data2) {
            var orders = data2.results[0].getProperty("orders");
            ok(orders.length === 10, "The customers must have 10 Orders");
        }).fail(testFns.handleFail).fin(start);
            
    });

    test("query with two nested expands", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        var query = EntityQuery.from("OrderDetails")
            .where("orderID", "==", 11069)
            .expand(["order.customer", "order.employee"]);
        stop();
        em.executeQuery(query).then(function(data) {
            var r = data.results[0];
            var c = r.getProperty("order").getProperty("customer");
            ok(c, "c should not be null");
            var e = r.getProperty("order").getProperty("employee");
            ok(e, "e should not be null");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query with two fields", function () {
        var em = newEm();
        var q = EntityQuery.from("Orders")
            .where("requiredDate", "<", "shippedDate")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            r.forEach(function(r) {
                var reqDt = r.getProperty("requiredDate");
                var shipDt = r.getProperty("shippedDate");
                ok(reqDt.getTime() < shipDt.getTime(), "required dates should be before shipped dates");
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query with two fields & contains", function () {
        var em = newEm();
        var q = EntityQuery.from("Employees")
            .where("lastName", "startsWith", "firstName")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be at least one record where lastName startsWith firstName");
            r.forEach(function (r) {
                var lastNm = r.getProperty("lastName").toLowerCase();
                var firstNm = r.getProperty("firstName").toLowerCase();
                ok(lastNm.indexOf(firstNm) >=0, "lastName should start with firstName - check the database first this may be a test data bug");
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query with two fields & contains literal", function () {
        var em = newEm();
        var q = EntityQuery.from("Employees")
            .where("lastName", "startsWith", "Dav")
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be some employees named 'Dav'");
            var isOk = r.every(function (e) {
                return e.getProperty("lastName").toLowerCase().indexOf("dav") >= 0;
            });
            ok(isOk, "lastName should start with 'Dav'");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query with two fields & contains literal forced", function () {
        var em = newEm();
        var q = EntityQuery.from("Employees")
            .where("lastName", "startsWith", "firstName", true)
            .take(20);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length === 0, "should be no recs returned");
        }).fail(testFns.handleFail).fin(start);
    });
    

    test("query with inlineCount", function() {
        var em = newEm();
        var q = EntityQuery.from("Customers")
            .take(20)
            .inlineCount(true);
        stop();
        em.executeQuery(q).then(function(data) {
            var r = data.results;
            var count = data.inlineCount;
            ok(count > r.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query without inlineCount", function () {
        var em = newEm();
        var q = EntityQuery.from("Customers")
            .take(5);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var inlineCount = data.inlineCount;
            ok(!inlineCount);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query with inlineCount 2", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - nested navigation thru joins not yet supported");
            return;
        }

        var em = newEm();
        var q = EntityQuery.from("Orders")
            .where("customer.companyName", "startsWith", "C")
            .take(5)
            .inlineCount(true);
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            var count = data.inlineCount;
            ok(count > r.length);
        }).fail(testFns.handleFail).fin(start);
    });

    test("fetchEntityByKey", function() {
        var em = newEm();
        var alfredsID = wellKnownData.alfredsID;
        stop();
        var alfred;
        em.fetchEntityByKey("Customer", alfredsID).then(function(data) {
            alfred = data.entity;
            ok(alfred, "alfred should have been found");
            ok(data.fromCache === false, "should have been from database");
            return em.fetchEntityByKey("Customer", alfredsID, true);
        }).then(function(data2) {
            var alfred2 = data2.entity;
            ok(alfred2, "alfred2 should have been found");
            ok(alfred === alfred2, "should be the same entity");
            ok(data2.fromCache === true, "should have been from cache");
            return em.fetchEntityByKey(data2.entityKey);
        }).then(function(data3) {
            var alfred3 = data3.entity;
            ok(alfred3 === alfred, "alfred3 should = alfred");
            ok(data3.fromCache === false, "should not have been from cache");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("fetchEntityByKey - deleted", function () {
        var em = newEm();
        var alfredsID = wellKnownData.alfredsID;
        stop();
        var alfred;
        em.fetchEntityByKey("Customer", alfredsID).then(function (data) {
            alfred = data.entity;
            ok(alfred, "alfred should have been found");
            ok(data.fromCache === false, "should have been from database");
            alfred.entityAspect.setDeleted();
            return em.fetchEntityByKey("Customer", alfredsID, true);
        }).then(function (data2) {
            var alfred2 = data2.entity;
            ok(alfred2 == null, "alfred2 should not have been found");
            ok(data2.fromCache === true, "should have been from cache");
            return em.fetchEntityByKey(data2.entityKey, true);
        }).then(function (data3) {
            var alfred3 = data3.entity;
            ok(alfred3 === null, "alfred3 should = alfred");
            ok(data3.fromCache === true, "should not have been from cache");
            
            em.setProperties({ queryOptions: em.queryOptions.using(MergeStrategy.OverwriteChanges) });
            return em.fetchEntityByKey(data3.entityKey, true);
        }).then(function (data4) {
            var alfred4 = data4.entity;
            ok(alfred4 === alfred, "alfred3 should = alfred");
            ok(data4.fromCache === false, "should not have been from cache");
        }).fail(testFns.handleFail).fin(start);
    });

    
    test("fetchEntityByKey - cache first not found", function () {
        var em = newEm();
        var alfredsID = wellKnownData.alfredsID;
        stop();
        var alfred;
        em.fetchEntityByKey("Customer", alfredsID, true).then(function (data) {
            alfred = data.entity;
            ok(alfred, "alfred should have been found");
            ok(data.fromCache === false, "should have been from database");
        }).fail(testFns.handleFail).fin(start);
    });

    test("fetchEntityByKey - missing key", function () {
        var em = newEm();
        var alfredsID = '885efa04-cbf2-4dd7-a7de-083ee17b6ad7'; // not a valid key
        stop();
        var alfred;
        em.fetchEntityByKey("Customer", alfredsID, true).then(function (data) {
            alfred = data.entity;
            ok(alfred === null, "alfred should not have been found");
            ok(data.fromCache === false, "should have been from database");
            ok(data.entityKey);
        }).fail(testFns.handleFail).fin(start);
    });

    test("fetchEntityByKey - bad args", function () {
        var em = newEm();
        stop();
        try {
            em.fetchEntityByKey("Customer").then(function(data) {
                ok(false, "should not have gotten here");
            }).fail(testFns.handleFail).fin(start);
        } catch (e) {
            ok(e.message.indexOf("EntityKey") >= 0, "should have an error message than mentions 'EntityKey'");
            start();
        }
    });

    
    test("hasChanges after query",  function () {
        var em = newEm();
        var query = EntityQuery.from("Customers").take(20);
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length === 20);
            ok(!em.hasChanges());
        }).fail(testFns.handleFail).fin(start);

    });

    test("hasChanges after query 2", function () {
        var em = newEm();
        var query = EntityQuery.from("Customers").take(20);
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length === 20);
            ok(!em.hasChanges());
            return r[0].entityAspect.loadNavigationProperty("orders");
        }).then(function (data2) {
            var orders = data2.results;
            ok(orders.length > 0, "should be some orders - this is a 'test' bug if not");
            var areAllOrders = orders.every(function(o) {
                return o.entityType.shortName === "Order";
            });
            ok(areAllOrders, "all results should be of the 'order' type");
            ok(!em.hasChanges(), "should not have changes after nav prop load");
            var changes = em.getChanges();
            ok(changes.length === 0, "getChanges should return 0 results");
        }).fail(queryFailed).fin(start);

        function queryFailed(error) {
            ok(false, "query failed with error message = " + error.message);
        }
    });
    
    test("hasChanges after query 3", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        var query = EntityQuery.from("Customers").take(20);
        stop();
        em.executeQuery(query).then(function (data) {
            var r = data.results;
            ok(r.length === 20);
            ok(!em.hasChanges());
            return query.expand("orders").using(em).execute();
        }).then(function (data2) {
            var r2 = data2.results;
            ok(r2.length === 20);
            ok(!em.hasChanges(), "should not have changes after nav prop load");
            var changes = em.getChanges();
            ok(changes.length === 0, "getChanges should return 0 results");
        }).fail(queryFailed).fin(start);

        function queryFailed(error) {
            ok(false, "query failed with error message = " + error.message);
        }
    });


    
    test("can run two queries in parallel for fresh EM w/ empty metadataStore", 1, function () {
        var em = newEm();
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
            var id = data.results[0].getProperty(testFns.productKeyName).toString();

            var query = new breeze.EntityQuery()
                .from("Products").where(testFns.productKeyName, '==', id).take(5);
            query.using(em).execute().then(function(data2) {
                r = data2.results;
                ok(r.length == 1);
                query = new breeze.EntityQuery()
                    .from("Products").where(testFns.productKeyName, '!=', id);
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
    

    test("query results notification", function () {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where(testFns.customerKeyName, "==", alfredsID)
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
            // return query.expand("orders").execute();
            // same as above but doesn't need expand
            return customer.entityAspect.loadNavigationProperty("orders");
        }).then(function (data2) {
            ok(arrayChangedCount === 1, "should only see a single arrayChanged event fired");
            ok(adds && adds.length > 0, "should have been multiple entities shown as added");
            var orderType = em.metadataStore.getEntityType("Order");
            var newOrder = orderType.createEntity();
            orders.push(newOrder);
            ok(arrayChangedCount === 2, "should have incremented by 1");
            ok(adds && adds.length === 1, "should have only a single entity added here");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query results notification suppressed", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where(testFns.customerKeyName, "==", alfredsID)
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
            ok(arrayChangedCount === 0, "should be no arrayChanged events fired");
            var orderType = em.metadataStore.getEntityType("Order");
            var newOrder = orderType.createEntity();
            orders.push(newOrder);
            ok(arrayChangedCount === 0, "should be no arrayChanged events fired");
            
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
            .where(testFns.customerKeyName, "==", alfredsID)
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
            ok(arrayChangedCount === 1, "should only see a single arrayChanged event fired");
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
            .where(testFns.customerKeyName, "==", alfredsID)
            .using(em);
        stop();
        query.execute().then(function(data) {
            var customer = data.results[0];
            var sameQuery = data.query;
            ok(query === sameQuery, "not the same query");
        }).fail(testFns.handleFail).fin(start);
    });

    test("duplicates after relation query", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var em = newEm();
        em.queryOptions = em.queryOptions.using(MergeStrategy.OverwriteChanges);
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where(testFns.customerKeyName, "==", alfredsID);
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
        }).then(function (data2) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 records");
            var details = customer.getProperty("orders");
            var dups = testFns.getDups(details);
            ok(dups.length === 0, "should be no dups");
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

    test("post create init with no ctor", function () {


        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));

        var dt = new Date();
        var empInitializer = function (emp) {
            
            emp.setProperty("hireDate", dt);

            emp.foo = "Foo " + emp.getProperty("hireDate").toString();
        };

        em.metadataStore.registerEntityTypeCtor("Employee", null, empInitializer);

        var query = EntityQuery.from("Employees").top(1);

        stop(); // going async
        em.executeQuery(query).then(function (data) {
            var emp = data.results[0];
            ok(emp.foo, "foo property should exist");
            var sameDt = emp.getProperty("hireDate");
            ok(dt.getTime() === sameDt.getTime());

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
        var qo = QueryOptions.defaultInstance;
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
        customer.setProperty(testFns.customerKeyName, alfredsID);
        var ek = customer.entityAspect.getKey();
        var sameCustomer = em.findEntityByKey(ek);
        ok(customer === sameCustomer, "customer should == sameCustomer");
    });
    
    test("reject change to existing key", function() {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers").where(testFns.customerKeyName, "==", alfredsID);
        stop();
        query.using(em).execute().then(function(data) {        
            ok(data.results.length === 1,"should have fetched 1 record");
            var customer = custType.createEntity();        
            em.attachEntity(customer);
            try {
                customer.setProperty(testFns.customerKeyName, alfredsID);
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
        customer.setProperty(testFns.customerKeyName, alfredsID); // 785efa04-cbf2-4dd7-a7de-083ee17b6ad2
        var ek = customer.entityAspect.getKey();
        var sameCustomer = em.getEntityByKey(ek);
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
            if (count !== 1) {
                ok(false, "expected one result, got " + count);
            } else {
                var inCache = em.getEntities();
                if (inCache.length === 2) {

                    // DUPLICATE ID DETECTED SHOULD NEVER GET HERE
                    var c1 = inCache[0], c2 = inCache[1];
                    ok(false,
                        "Two custs in cache with same ID, ({0})-{1} and ({2})-{3}".format(// format is my extension to String
                            c1.getProperty(testFns.customerKeyName), c1.getProperty("companyName"), c2.getProperty(testFns.customerKeyName), c2.getProperty("companyName")));
                }

                // This test should succeed; it fails because of above bug!!!
                ok(results[0] === customer,
                    "refresh query result is the same as the customer in cache" +
                        " whose updated name is " + customer.getProperty("companyName"));
            }
            start();
        }).fail(testFns.handleFail);
    });

    

   
    test("query uni (1-n) region and territories", function () {
        var em = newEm();
        var q = new EntityQuery()
            .from("Regions")
            .where("regionDescription", "==", "Northern");
            

        stop();
        em.executeQuery(q).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
            var region = data.results[0];
            var terrs = region.getProperty("territories");
            return terrs.load();
        }).then(function (data2) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
            ok(data2.results.length > 0, "This may be a test bug - need a region with territories");
        }).fail(testFns.handleFail).fin(start);
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
            testFns.assertIsSorted(customers, "companyName", breeze.DataType.String, false, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
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

    test("greater than op", function () {
        var em = newEm();

        var query = EntityQuery.from("Orders")
            .where("freight", ">", 100);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var orders = data.results;
            ok(orders.length > 0);
            
        }).fail(testFns.handleFail).fin(start);
    });

   
    test("predicate", function () {
        var em = newEm();

        var baseQuery = EntityQuery.from("Orders");
        var pred1 = new Predicate("freight", ">", 100);
        var pred2 = new Predicate("orderDate", ">", new Date(1998, 3, 1));
        var query = baseQuery.where(pred1.and(pred2));
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var orders = data.results;
            ok(orders.length > 0);
        }).fail(testFns.handleFail).fin(start);
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
        }).fail(testFns.handleFail).fin(start);
    });

    test("query with contains", function() {
        var em = newEm();
        var query = EntityQuery.from("Customers")
            .where("companyName", FilterQueryOp.Contains, 'market');
        //.where("CompanyName", "contains", 'market'); // Alternative to FilterQueryOp
        //.where("substringof(CompanyName,'market')", "eq", true); // becomes in OData
        //.where("indexOf(toLower(CompanyName),'market')", "ne", -1); // equivalent to
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0);
        }).fail(testFns.handleFail).fin(start);
    });
    
    
     test("predicate 2", function () {
        var em = newEm();

        var baseQuery = EntityQuery.from("Orders");
        var pred1 = Predicate.create("freight", ">", 100);
        var pred2 = Predicate.create("orderDate", ">", new Date(1998, 3, 1));
        var newPred = Predicate.and([pred1, pred2]);
        var query = baseQuery.where(newPred);
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var orders = data.results;
            ok(orders.length > 0);

        }).fail(testFns.handleFail).fin(start);
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
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - OrderDetails is not queryable");
            return;
        }

        var em = newEm();
        var count = 5;
        var query = EntityQuery.from("OrderDetails").take(count);
        stop();
        query.using(em).execute().then(function (data) {
            var orderDetails = data.results;
            ok(orderDetails.length === count);
            var promises = orderDetails.map(function (od) {
                return od.entityAspect.loadNavigationProperty("product").then(function (data2) {
                    var products = data2.results;
                    ok(products.length === 1, "should only return a single product");
                    var product = products[0];
                    ok(od.getProperty("product") === product, "product should be set");
                });
            });
            return Q.all(promises);
        }).then(function () {
            ok(true, "all promises completed");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("unidirectional navigation query", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - OrderDetails is not queryable");
            return;
        }
        var em = newEm();
        
        var query = EntityQuery.from("OrderDetails")
            .where("product.productID", "==", 1);
        stop();
        var orderDetails;
        query.using(em).execute().then(function(data) {
            orderDetails = data.results;
            ok(orderDetails.length > 0);
            orderDetails.forEach(function(od) {
                ok(od.getProperty("productID") === 1, "productID should === 1");
            });
            var q2 = EntityQuery.from("Products")
                .where("productID", "==", 1);
            return em.executeQuery(q2);
        }).then(function (data) {
            var product = data.results[0];
            orderDetails.forEach(function (od) {
                ok(od.getProperty("product") === product, "product should be set");
            });
        
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("unidirectional navigation bad query", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }
        var em = newEm();

        var query = EntityQuery.from("Products")
            .where("productID", "==", 1)
            .expand("orderDetails");

        stop();
        query.using(em).execute().then(function(data) {
            ok(false, "should not get here");
            
        }).fail(function(err) {
            if (testFns.DEBUG_WEBAPI) {
                ok(err.message.indexOf("OrderDetails") >= 1, " message should be about missing OrderDetails property");
            } else if (testFns.DEBUG_ODATA) {
                ok(err.message.indexOf("Product") >= 1, "should be an error message about the Product query");
            }
            
        }).fin(start);
    });


    test("fromEntities", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .take(2);
        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length === 2, "data.results length should be 2");
            var q2 = EntityQuery.fromEntities(orders);
            return q2.execute();
        }).then(function (data2) {
            ok(data2.results.length === 2, "data.results length should be 2");
        }).fail(testFns.handleFail).fin(start);
    });

    test("where nested property", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - Product.category.categoryName is not a nested property in mongo");
            return;
        }
        var em = newEm();

        var query = new EntityQuery()
             .from("Products")
             .where("category.categoryName", "startswith", "S")
             .expand("category");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            var products = data.results;
            var cats = products.map(function(product) {
                return product.getProperty("category");
            });
            cats.forEach(function(cat) {
                var catName = cat.getProperty("categoryName");
                ok(core.stringStartsWith(catName, "S"));
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("where nested property 2", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - Order.customer.region is not a nested property in mongo");
            return;
        }
        var em = newEm();

         var query = new EntityQuery()
             .from("Orders")
             .where("customer.region", "==", "CA");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            var customers = data.results;
            ok(customers.length > 0, "some customers should have been found");
        }).fail(testFns.handleFail).fin(start);
    });

    test("orderBy", function () {
        var em = newEm();

        var query = new EntityQuery("Products")
            .orderBy("productName desc")
            .take(5);
        stop();
        em.executeQuery(query).then(function(data) {
            var products = data.results;
            var productName = products[0].getProperty("productName");
            testFns.assertIsSorted(products, "productName", breeze.DataType.String, true, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
        }).fail(testFns.handleFail).fin(start);
    });

    test("expand", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }
        var em = newEm();

        var query = new EntityQuery()
            .from("Products");

        query = query.expand("category")
            .take(5);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
            var products = data.results;
            var cats = [];
            products.map(function (product) {
                var cat = product.getProperty("category");
                if (cat) {
                    cats.push(cats);
                }
            });
            ok(cats.length === 5, "should have 5 categories");

            start();
        }).fail(testFns.handleFail);
    });

    test("expand multiple", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }

        var em = newEm();

        var query = new EntityQuery("Orders");

        query = query.expand(["customer", "employee"])
            .take(20);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
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
            ok(custs.length === 20, "should have 20 customers");
            ok(emps.length === 20, "should have 20 employees");

            start();
        }).fail(testFns.handleFail);
    });
    
    test("expand nested", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }

        var em = newEm();

        var query = new EntityQuery()
            .from("Orders");

        query = query.expand("customer, orderDetails, orderDetails.product")
            .take(5);
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
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
            ok(custs.length === 5, "should have 5 customers");
            ok(orderDetails.length > 5, "should have > 5 orderDetails");
            ok(products.length > 5, "should have > 5 products");
        }).fail(testFns.handleFail).fin(start);
            
            
    });

    test("orderBy nested", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }
        var em = newEm();

        var query = new EntityQuery()
            .from("Products")
            .orderBy("category.categoryName desc")
            .expand("category");

        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("category");
            });

            testFns.assertIsSorted(cats, "categoryName", breeze.DataType.String, true, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
        }).fail(testFns.handleFail).fin(start);
    });

    test("orderBy two part nested", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }

        var em = newEm();

        var query = new EntityQuery()
            .from("Products")
            .orderBy(["category.categoryName desc", "productName"])
            .expand("category");

        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(em.getChanges().length === 0, "getChanges should return 0 results");
            var products = data.results;
            var cats = products.map(function (product) {
                return product.getProperty("category");
            });

            testFns.assertIsSorted(cats, "categoryName", breeze.DataType.String, true, em.metadataStore.localQueryComparisonOptions.isCaseSensitive);
        }).fail(testFns.handleFail).fin(start);
    });

    test("skiptake", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Products")
            .orderBy("productName");
        stop();
        var skipTakeCount = 5;
        em.executeQuery(query).then(function (data) {
            var products = data.results;

            var newq1 = query.skip(skipTakeCount);
            var newq1Url = newq1._toUri(em.metadataStore);
            var p1 = em.executeQuery(newq1).then(function (data1) {
                var custs1 = data1.results;
                equal(custs1.length, products.length - skipTakeCount);
            });

            var newq2 = query.take(skipTakeCount);
            var newq2Url = newq1._toUri(em.metadataStore);
            var p2 = em.executeQuery(newq2).then(function (data2) {
                var custs2 = data2.results;
                equal(custs2.length, skipTakeCount);
            });

            var newq3 = query.skip(skipTakeCount).take(skipTakeCount);
            var newq3Url = newq1._toUri(em.metadataStore);
            var p3 = em.executeQuery(newq3).then(function (data3) {
                var custs3 = data3.results;
                equal(custs3.length, skipTakeCount);
            })
            return Q.all([p1, p2, p3]);
        }).fail(testFns.handleFail).fin(start);
    });

    test("query expr - toLower", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("toLower(companyName)", "startsWith", "c");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var name = cust.getProperty("companyName").toLowerCase();
                return core.stringStartsWith(name, "c");
            }), "every cust should startwith a 'c'");

        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query expr - toUpper/substring", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("toUpper(substring(companyName, 1, 2))", "startsWith", "OM");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var val= cust.getProperty("companyName").substr(1,2).toUpperCase();
                return val === "OM";
            }), "every cust should have 'OM' as the 2nd and 3rd letters");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query expr - length", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("length(companyName)", ">", 20);
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            var custs = data.results;
            ok(custs.length > 0);
            ok(custs.every(function(cust) {
                var val = cust.getProperty("companyName");
                return val.length > 20;
            }), "every cust have a name longer than 20 chars");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("query expr - navigation then length", function() {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand is not yet supported");
            return;
        }

        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("length(customer.companyName)", ">", 30)
            .expand("customer");
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            var orders = data.results;
            ok(orders.length > 0);
            ok(orders.every(function(order) {
                var cust = order.getProperty("customer");
                var val = cust.getProperty("companyName");
                return val.length > 30;
            }), "every order must have a cust with a name longer than 30 chars");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("bad query expr -  bad property name", function() {
        var em = newEm();

        var query = new EntityQuery()
            .from("Orders")
            .where("length(customer.fooName)", ">", 30);
        // var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(false, "should not get here");
        }).fail(function(error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("fooName") > 0, "bad message");
            error.handled = true;
        }).fin(start);
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

    test("bad filter property", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("badCompanyName", "startsWith", "C");
        // var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(false, "shouldn't get here");
        }).fail(function(error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("badCompanyName") > 0, "bad message");
            error.handled = true;
        }).fin(start);

    });

    test("bad orderBy property ", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("companyName", FilterQueryOp.StartsWith, "C")
            .orderBy("badCompanyName");
        // var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(false, "shouldn't get here");
        }).fail(function(error) {
            ok(error instanceof Error);
            ok(error.message.indexOf("badCompanyName") > 0, "bad message");
            error.handled = true;          
        }).fin(start);

    });

    test("by EntityQuery.fromEntityKey ", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, wellKnownData.nancyID);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        em.executeQuery(query).then(function (data) {
            var emp = data.results[0];
            ok(emp.getProperty(testFns.employeeKeyName) === wellKnownData.nancyID);
        }).fail(testFns.handleFail).fin(start);

    });

    test("by EntityQuery.fromEntityNavigation  - (-> n) ", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        var orderType = em.metadataStore.getEntityType("Order");
        var entityKey = new EntityKey(empType, wellKnownData.nancyID);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        var emp;
        em.executeQuery(query).then(function (data) {
            emp = data.results[0];
            ok(emp.getProperty(testFns.employeeKeyName) === wellKnownData.nancyID);
            var np = emp.entityType.getProperty("orders");
            var q2 = EntityQuery.fromEntityNavigation(emp, np);
            return em.executeQuery(q2);
        }).then(function (data2) {
            ok(data2.results.length > 0, "no data returned");
            ok(data2.results.every(function (r) { return r.entityType === orderType; }));
            var orders = emp.getProperty("orders");
            ok(orders.length === data2.results.length, "local array does not match queried results");
        }).fail(testFns.handleFail).fin(start);

    });

    test("by EntityQuery.fromEntityNavigation - (-> 1) ", function() {
        var em = newEm();

        var pred = Predicate.create("customerID", "!=", null).and("employeeID", "!=", null);
        var query = EntityQuery.from("Orders").where(pred).take(1);

        stop();
        em.executeQuery(query).then(function(data) {
            var order = data.results[0];
            ok(order.entityType.shortName === "Order");
            var np = order.entityType.getProperty("employee");
            ok(np, "can't find nav prop 'Employee'");
            var q2 = EntityQuery.fromEntityNavigation(order, np);
            return em.executeQuery(q2);
        }).then(function(data2) {
            ok(data2.results.length === 1, "wrong amount of data returned");
            ok(data2.results[0].entityType.shortName === "Employee");
        }).fail(testFns.handleFail).fin(start);

    });

    test("by entityAspect.loadNavigationProperty - (-> n) ", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, wellKnownData.nancyID);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        var emp;
        em.executeQuery(query).then(function (data) {
            emp = data.results[0];
            return emp.entityAspect.loadNavigationProperty("orders");
        }).then(function (data2) {
            ok(data2.results.length > 0, "no data returned");
            ok(data2.results.every(function (r) { return r.entityType.shortName = "Order"; }));
            var orders = emp.getProperty("orders");
            ok(orders.length === data2.results.length, "local array does not match queried results");
        }).fail(testFns.handleFail).fin(start);

    });

    test("by entityAspect.loadNavigationProperty - (-> 1) ", function () {
        var em = newEm();

        var pred = Predicate.create("customerID", "!=", null).and("employeeID", "!=", null);
        var query = EntityQuery.from("Orders").where(pred).take(1);
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
        }).fail(testFns.handleFail).fin(start);

    });

    test("load from navigationProperty value.load (-> n)", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        var orderType = em.metadataStore.getEntityType("Order");
        var entityKey = new EntityKey(empType, wellKnownData.nancyID);
        var query = EntityQuery.fromEntityKey(entityKey);

        stop();
        var orders, emp;
        em.executeQuery(query).then(function (data) {
            emp = data.results[0];
            orders = emp.getProperty("orders");
            ok(orders.length === 0, "orders length should start at 0");
            return orders.load();
        }).then(function (data2) {
                ok(data2.results.length > 0, "no data returned");
                ok(data2.results.every(function (r) { return r.entityType === orderType; }));
                ok(orders.length === data2.results.length, "local array does not match queried results");
        }).fail(testFns.handleFail).fin(start);

    });


    test("WebApi metadata", function () {
        if (testFns.DEBUG_ODATA) {
            ok(true, "NA for OData impl");
            return;
        }
        stop();
        $.getJSON("breeze/NorthwindIBModel/Metadata", function (data, status) {
            // On success, 'data' contains the model metadata.
            //                console.log(data);
            ok(data);
            var metadata = typeof(data) === "string" ? JSON.parse(data) : data;
            var str = JSON.stringify(metadata, undefined, 4);
            testFns.output("Metadata");
            testFns.output(str);
            start();
        }).fail(testFns.handleFail);
    });

})(breezeTestFns);