(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    

    var Enum = core.Enum;

    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityKey = breeze.EntityKey;
    var EntityState = breeze.EntityState;
    
    
    var newEm = testFns.newEm;
    

    module("ko specific", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });
    
    if (testFns.modelLibrary !== "ko") {
        test("Skipping KO specific tests", function () {
            ok(true, "Skipped tests - ko specfic");
        });
        return;
    };


    test("reject changes reverts an unmapped property", 2, function () {
        var manager = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));

        var originalTime = new Date(2013, 0, 1);
        var Customer = function () {
            this.lastTouched = originalTime;
        };

        manager.metadataStore.registerEntityTypeCtor("Customer", Customer);


        // create a fake customer
        var cust = manager.createEntity("Customer", { companyName: "Acme" },
            breeze.EntityState.Unchanged);
        var touched = cust.lastTouched();

        // an hour passes ... and we visit the customer object
        cust.companyName("Beta");
        cust.lastTouched(touched = new Date(touched.getTime() + 60000));

        // an hour passes ... and we visit to cancel
        cust.lastTouched(touched = new Date(touched.getTime() + 60000));
        cust.entityAspect.rejectChanges(); // roll back name change

        equal(cust.companyName(), "Acme", "'name' data property should be rolled back");
        ok(originalTime === cust.lastTouched(),
            core.formatString("'lastTouched' unmapped property should be rolled back. Started as {0}; now is {1}",  originalTime, cust.lastTouched()));
    });

    test("ko computed wierdness", function () {
        var xxx = {};
        xxx.lastName = ko.computed({
            read: function () {
                return this._lastName;
            },
            write: function (newValue) {
                this._lastName = newValue.toUpperCase();
            },
            owner: xxx
        });

        xxx.lastName("smith");

        var lastName = xxx.lastName();
        // NOT SMITH - lastName is actually undefined here.
        ok(lastName !== "SMITH", "is not smith because of ko issue");

        // But we can make it work ....

        // -- hack: create a dummy variable --- 

        xxx.dummy = ko.observable(null);
        xxx.lastName = ko.computed({
            read: function () {
                this.dummy();
                return this._lastName;
            },
            write: function (newValue) {
                this._lastName = newValue.toUpperCase();
                this.dummy.valueHasMutated();
            },
            owner: xxx
        });

        xxx.lastName("smith");

        var lastName = xxx.lastName();
        // now it works -- lastName is actually null here.
        ok(lastName === "SMITH", "should be all uppercase");


    });
    
    test("registerEntityType", function () {

        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(testFns.newMs());

        em1.metadataStore.registerEntityTypeCtor("Region", function () {
            this.foo = "foo";
        }, function (entity) {
            entity.bar = "bar";
        });
        var q = EntityQuery.from("Regions").take(1);
        stop();
        em1.executeQuery(q).then(function (data) {
            ok(data.results.length === 1);
            var region = data.results[0];
            // 4 = 3 mapped + 1 unmapped ( foo) - should be no mention of 'bar'
            ok(region.entityType.dataProperties.length === 4, "should only have 4 properties");
            var regionType = em1.metadataStore.getEntityType("Region");
            var region2 = regionType.createEntity();
            ok(region2.entityType.dataProperties.length === 4, "should only have 4 properties");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("registerEntityType 2", function () {

        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(testFns.newMs());

        em1.metadataStore.registerEntityTypeCtor("Region", function () {
            this.foo = "foo";
        }, function (entity) {
            entity.bar = "bar";
        });
        var q = EntityQuery.from("Regions").take(2);
        stop();
        em1.executeQuery(q).then(function (data) {
            ok(data.results.length === 2);
            var region = data.results[0];
            // 4 = 3 mapped + 1 unmapped ( foo) - should be no mention of 'bar'
            ok(region.entityType.dataProperties.length === 4, "should only have 4 properties");
            ok(region.bar === "bar", "bar property should = 'bar'");
            var regionType = em1.metadataStore.getEntityType("Region");
            var bundle = em1.exportEntities();
            var em2 = new EntityManager();
            em2.metadataStore.registerEntityTypeCtor("Region", function () {
                this.foo = "foo";
            }, function (entity) {
                entity.bar = "bar";
            });

            em2.importEntities(bundle);
            var ents = em2.getEntities();
            ents.forEach(function (ent) {
                ok(ent.entityType.dataProperties.length === 4, "should only have 4 properties");
                ok(ent.bar === "bar", "bar property should = 'bar'");
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("add knockout computed property based on collection navigation via constructor", 2, function () {
          // clones based on a fully populated store created at top of tests
          // see cloneModuleMetadataStore() below
        var store = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(store);

        var Employee = function () {
            this.orderCount = ko.computed(
                {
                    read: function () {
                        return this.orders().length;
                    },
                    // Orders not defined yet
                    deferEvaluation: true
                }, this);
        };

        store.registerEntityTypeCtor("Employee", Employee);

        var employeeType = store.getEntityType("Employee");
        var emp = employeeType.createEntity(); // DIES HERE

        equal(emp.orderCount(), 0,
            "should have a zero orderCount");

        var orderType = store.getEntityType("Order");
        var newOrder = orderType.createEntity();
        emp.orders.push(newOrder);

        equal(emp.orderCount(), 1,
            "orderCount should be 1 after pushing newOrder");
    });


    
    test("disallow setting collection navigation properties", function () {
        // ko specific
        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        var orderType = em.metadataStore.getEntityType("Order");
        var order = orderType.createEntity();
        em.attachEntity(customer);
        var origOrders = customer.getProperty("orders");
        ok(origOrders.length === 0);

        customer.orders.push(order);
        ok(origOrders.length === 1);
        try {
            customer.setProperty("orders", ["foo", "bar"]);
            ok(false, "should not get here");
        } catch (e) {
            ok(e.message.indexOf("navigation") >= 0, "Exception should relate to navigation:" + e);
            ok(customer.getProperty("orders") == origOrders);
        }
    });
    
    test("query results notification", function () {
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
        var koArrayChangedCount = 0;
        var adds;
        var koAdds;
        query.execute().then(function (data) {
            var customer = data.results[0];
            customer.orders.subscribe(function(val) {
                koArrayChangedCount++;
                koAdds = val;
            });
            customer.orders().arrayChanged.subscribe(function (args) {
                arrayChangedCount++;
                adds = args.added;
            });
            return query.expand("orders").execute();
        }).then(function (data2) {
            ok(arrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(koArrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(adds && adds.length > 0, "should have been multiple entities shown as added");
            deepEqual(adds, koAdds, "adds and koAdds should be the same");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("chaining on write", function () {
     
        var em1 = newEm();
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        var sameCust = cust1.companyName("First");
        ok(sameCust === cust1, "ko setters need to chain");
        var val1 = cust1.companyName();
        ok(val1 === "First");
        cust1.companyName("Second").contactTitle("Foo").contactName("Bar");
        ok(cust1.contactTitle() == "Foo");
        ok(cust1.contactName() == "Bar");
    });
    
    test("observable array", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand not yet supported");
            return;
        }

        var items = [];
        var oa = ko.observableArray(items);
        var changeCount = 0;
        oa.subscribe(function () {
            changeCount++;
        });
        oa.push("adfadf");
        var em = newEm();

        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where(testFns.customerKeyName, "==", alfredsID)
            .expand("orders");
        var customer;
        stop();
        query.using(em).execute().then(function (data) {
            customer = data.results[0];
            var orderType = em.metadataStore.getEntityType("Order");
            var order = orderType.createEntity();
            var count = customer.orders().length;
            var ix = 0;
            customer.orders.subscribe(function () {
                ix = ix + 1;
            });
            customer.orders.push(order);
            var count2 = customer.orders().length;
            ok(count2 == count + 1);
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("observable array mutate on change", function () {
        var em = newEm();

        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where(testFns.customerKeyName, "==", alfredsID);
        var customer;
        stop();
        var orders;
        var koOrders;
        var arrayChangeCount = 0;
        var koChangeCount = 0;
        query.using(em).execute().then(function (data) {
            customer = data.results[0];
            orders = customer.orders();
            orders.arrayChanged.subscribe(function(changes) {
                arrayChangeCount++;
            });
            koOrders = customer.orders;
            koOrders.subscribe(function(x) {
                koChangeCount++;
            });
            return customer.entityAspect.loadNavigationProperty("orders");
        }).then(function (orders2) {
            var x = orders2;
            ok(arrayChangeCount === koChangeCount);
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("disallow setting collection navigation properties", function () {
        // ko specific
        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        var orderType = em.metadataStore.getEntityType("Order");
        var order = orderType.createEntity();
        em.attachEntity(customer);
        var origOrders = customer.orders();
        ok(origOrders.length === 0);
        customer.orders.push(order);
        ok(origOrders.length === 1);
        try {
            customer.orders(["foo", "bar"]);
            ok(false, "should not get here");
        } catch (e) {
            ok(e.message.indexOf("navigation") >= 0, "Exception should relate to navigation:" + e);
            ok(customer.orders() == origOrders);
        }
    });
    
})(breezeTestFns);