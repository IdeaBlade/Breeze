(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;

    var Enum = core.Enum;
    var Event = core.Event;

    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityKey = breeze.EntityKey;
    var DataType = breeze.DataType;

    var newEm = testFns.newEm;
    var newMs = testFns.newMs;
    var wellKnownData = testFns.wellKnownData;

    module("entity", {
        setup: function () {
            breeze.DataType.DateTime.defaultValue = new Date(2000, 0, 1);
            testFns.setup();
        },
        teardown: function () {

        }
    });

    test("new instead of createEntity with entityAspect", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        
        var Customer = testFns.models.CustomerWithMiscData();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };
        em.metadataStore.registerEntityTypeCtor("Customer", Customer);

        var cust1 = new Customer();
        cust1.city = "xxx";
        var ea = new breeze.EntityAspect(cust1);
        cust1.setProperty("city", "yyy");
        cust1.setProperty("customerID", breeze.core.getUuid());

        var cust2 = em.metadataStore.getEntityType("Customer").createEntity();
        cust2.setProperty("customerID", breeze.core.getUuid());

        em.attachEntity(cust1);
        em.attachEntity(cust2);
        ok(true, "should get here");
    });


    test("new instead of createEntity w/o entityAspect", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));

        var Customer = testFns.models.CustomerWithMiscData();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        em.metadataStore.registerEntityTypeCtor("Customer", Customer);
       
        
        if (testFns.modelLibrary === "backingStore") {
            var cust0 = new Customer();
            cust0.setProperty("city", "zzz");
            cust0.setProperty("customerID", breeze.core.getUuid());
            em.attachEntity(cust0);
            ok(cust0.getProperty("city") === "zzz", "city should be zzz");
       
            var cust1 = new Customer();
            cust1.city = "zzz";
            var city = cust1.city;
            ok(city === "zzz", "city should be 'zzz'");
            cust1.customerID = breeze.core.getUuid();
            em.attachEntity(cust1);
            ok(cust1.getProperty("city") === "zzz", "city should be zzz");
        } else if (testFns.modelLibrary = "ko") {
            var cust1 = new Customer();
            cust1.city = "zzz";
            var city = cust1.city;
            ok(city === "zzz", "city should be 'zzz'");
            cust1.customerID = breeze.core.getUuid();
            em.attachEntity(cust1);
            ok(cust1.getProperty("city") === "zzz", "city should be zzz");
        } else if (testFns.modelLibrary === "backbone") {
            var cust0 = new Customer();
            cust0.setProperty("city", "zzz");
            cust0.setProperty("customerID", breeze.core.getUuid());
            em.attachEntity(cust0);
            ok(cust0.getProperty("city") === "zzz", "city should be zzz");
        }

        
    });

    test("event token is the same for different entities", function () {
        var em = newEm();

        var emp1 = em.createEntity("Employee", { firstName: "Joe1", lastName: "Smith1", birthDate: new Date(2000, 1, 1) });
        var emp2 = em.createEntity("Employee", { firstName: "Joe2", lastName: "Smith2", birthDate: new Date(2000, 1, 1) });

        var token1 = emp1.entityAspect.propertyChanged.subscribe(function (changeArgs) {
            var a = changeArgs;
        });        
        var token2 = emp2.entityAspect.propertyChanged.subscribe(function (changeArgs) {
            var a = changeArgs;
        });

        ok(token1 != token2, "Tokens should not be equal.");
    });

    test("set nullable props with an empty string", function () {
        var em = newEm();

        var emp = em.createEntity("Employee", { firstName: "Joe", lastName: "Smith", birthDate: new Date(2000, 1, 1) });
        var bd = emp.getProperty("birthDate");
        ok(bd != null);
        emp.setProperty("birthDate", "");
        var b2 = emp.getProperty("birthDate");
        ok(b2 === null, "birthDate should be null");
    });



    test("create and init relations", function () {
        var em = newEm();
        var newDetail = null;
        // pretend parent entities were queried
        var cfg = {};
        cfg[testFns.orderKeyName] = 1;
        var parentOrder = em.createEntity("Order", cfg, breeze.EntityState.Unchanged);
        cfg = {};
        cfg[testFns.productKeyName] = 1;
        var parentProduct = em.createEntity("Product", cfg, breeze.EntityState.Unchanged);

        if (!testFns.DEBUG_MONGO) {
            // Can't initialize with related entity. Feature request to make this possible
            newDetail = em.createEntity("OrderDetail", { order: parentOrder, product: parentProduct });
            ok(newDetail && newDetail.entityAspect.entityState.isAdded(), "newDetail should be 'added'");
        }
        ok(parentOrder.entityAspect.entityState.isUnchanged(), "parentOrder should be 'unchanged'");
        ok(parentProduct.entityAspect.entityState.isUnchanged(), "parentProduct should be 'unchanged'");
    });

    test("create and init relations 2", function () {
        if (testFns.DEBUG_MONGO) {
            ok("n/a for MONGO - OrderDetail is not an entityType");
            return;
        }
        var em = newEm();
        var newDetail = null;
        // pretend parent entities were queried
        var cfg = {};
        cfg[testFns.orderKeyName] = 1;
        var parentOrder = em.createEntity("Order", cfg, breeze.EntityState.Detached);
        cfg = {};
        cfg[testFns.productKeyName] = 1;
        var parentProduct = em.createEntity("Product", cfg, breeze.EntityState.Detached);


        // Can't initialize with related entity. Feature request to make this possible
        newDetail = em.createEntity("OrderDetail", { order: parentOrder, product: parentProduct });

        ok(newDetail && newDetail.entityAspect.entityState.isAdded(), "newDetail should be 'added'");

        ok(parentOrder.entityAspect.entityState.isAdded(), "parentOrder should be 'added'");
        ok(parentProduct.entityAspect.entityState.isAdded(), "parentProduct should be 'added'");
    });

    test("nullable dateTime", function () {
        var em = newEm();
        var emp = em.createEntity("Employee", { firstName: "Joe", lastName: "Smith" });
        ok(emp.entityAspect.entityState === breeze.EntityState.Added, "entityState should be 'Added'");
        var birthDate = emp.getProperty("birthDate");
        ok(birthDate === null, "birthDate should be null");
        var q = EntityQuery.from("Employees").where("birthDate", "==", null);
        stop();
        em.executeQuery(q).then(function (data) {
            var empsWithNullBirthDates = data.results;
            ok(empsWithNullBirthDates.length > 0, "should be at least 1 employee with a null birthdate");
            empsWithNullBirthDates.forEach(function (emp) {
                var birthDate = emp.getProperty("birthDate");
                ok(birthDate === null, "queried birthDate should be null");
            });
        }).fail(testFns.handleFail).fin(start);
    });


    test("registerEntityTypeCtor causing error on importEntities1", function () {
        // 4/25/13 - sbelini - this test should not fail - it's just to ensure the third parameter is causing the error
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Customer = testFns.models.CustomerWithMiscData();
        var productType = em.metadataStore.getEntityType("Customer");

        em.metadataStore.registerEntityTypeCtor("Customer", Customer);

        var m1 = em.createEmptyCopy();
        var customerType = m1.metadataStore.getEntityType("Customer");
        var cfg = {};
        cfg[testFns.customerKeyName] = breeze.core.getUuid();
        var customer = m1.createEntity("Customer", cfg);
        var exported = m1.exportEntities([customer]);
        var m2 = em.createEmptyCopy();

        m2.importEntities(exported);
        ok(true);
    });

    test("registerEntityTypeCtor with ES5 props and importEntities", function () {
        // 4/25/13 - sbelini - this test should not fail - it's just to ensure the third parameter is causing the error
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Customer = testFns.models.CustomerWithES5Props();
        // var productType = em.metadataStore.getEntityType("Customer");

        em.metadataStore.registerEntityTypeCtor("Customer", Customer);

        var m1 = em.createEmptyCopy();
        var customerType = m1.metadataStore.getEntityType("Customer");
        var cfg = {};
        cfg[testFns.customerKeyName] = breeze.core.getUuid();
        var customer = m1.createEntity("Customer", cfg);
        var exported = m1.exportEntities([customer]);
        var m2 = em.createEmptyCopy();

        m2.importEntities(exported);
        ok(true);
    });

    test("registerEntityTypeCtor causing error on importEntities2", function () {
        // 4/25/13 - sbelini - this test is failing due to the third parameter in registerEntityTypeCtor
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var productType = em.metadataStore.getEntityType("Customer");

        em.metadataStore.registerEntityTypeCtor("Customer", null, function (entity) {
            var a = 1;
        });

        var m1 = em.createEmptyCopy();
        var customerType = m1.metadataStore.getEntityType("Customer");
        var cfg = {};
        cfg[testFns.customerKeyName] = breeze.core.getUuid();
        var customer = m1.createEntity("Customer", cfg);
        var exported = m1.exportEntities([customer]);
        var m2 = em.createEmptyCopy();

        m2.importEntities(exported);

        ok(true);
    });

    test("rejectChanges on unmapped property", function () {
        var em1 = newEm(newMs());
        var Customer = testFns.models.CustomerWithMiscData();
        em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em1.fetchMetadata().then(function () {
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust = custType.createEntity();
            em1.addEntity(cust);
            cust.setProperty("companyName", "foo2");
            cust.setProperty("miscData", "zzz");
            cust.entityAspect.acceptChanges();
            cust.setProperty("miscData", "xxx");
            cust.entityAspect.rejectChanges();
            var miscData = cust.getProperty("miscData");
            ok(miscData === 'zzz', "miscData should be zzz");
        }).fail(testFns.handleFail).fin(start);
    });

    test("rejectChanges with ES5 props", function () {
        var em1 = newEm(newMs());
        var Customer = testFns.models.CustomerWithES5Props();
        em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em1.fetchMetadata().then(function () {
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust = custType.createEntity();
            em1.addEntity(cust);
            cust.setProperty("companyName", "foo2");
            var companyName = cust.getProperty("companyName");
            ok(companyName === "FOO2", "should be uppercased");
            cust.entityAspect.acceptChanges();
            cust.setProperty("companyName", "foo3");
            var companyName = cust.getProperty("companyName");
            ok(companyName === "FOO3", "should be uppercased");
            cust.entityAspect.rejectChanges();
            var companyName = cust.getProperty("companyName");
            ok(companyName === 'FOO2', "comapnyName should be FOO2");
        }).fail(testFns.handleFail).fin(start);
    });

    test("set foreign key property to null", function () {
        var productQuery = new EntityQuery("Products").take(1);


        stop();
        var em = newEm();
        em.executeQuery(productQuery).then(function (data) {
            return data.results[0].entityAspect.loadNavigationProperty("supplier");
        }).then(assertProductSetSupplierIDToNull).fail(testFns.handleFail).fin(start);
    });

    function assertProductSetSupplierIDToNull(data) {
        var products = data.results;
        var firstProduct = products[0];

        ok(firstProduct.getProperty(testFns.supplierKeyName), "SupplierID should not be null");

        firstProduct.setProperty(testFns.supplierKeyName, null);

        ok(firstProduct.getProperty(testFns.supplierKeyName) == null, "is SupplierID null?");
    }

    test("null foriegn key", function () {
        var em = newEm();
        var productType = em.metadataStore.getEntityType("Product");
        var product = productType.createEntity();
        em.attachEntity(product);
        product.setProperty("productName", "foo");
        product.setProperty('supplierID', null);
        var errs = product.entityAspect.getValidationErrors();
        ok(errs.length === 0, "supplierId on product should be nullable");
        var q = EntityQuery.from("Products").take(1);
        stop();
        em.executeQuery(q).then(function (data) {
            var products = data.results;
            product = products[0];
            product.setProperty('supplierID', null);
            errs = product.entityAspect.getValidationErrors();
            ok(errs.length === 0, "supplierId on product should be nullable");
        }).fail(testFns.handleFail).fin(start);
        

        //Set product's SupplierID value to null
        //Set product's Supplier to null
        //Set product's SupplierID to 0

    });

    // TODO: finish this
    //test("datatype coercion - boolean - custom conversion", function () {
    //    var em = newEm(); // new empty EntityManager
    //    var oldFn = DataType.Boolean.parse;
    //    var newFn = function(source, sourceTypeName) {

    //        if (sourceTypeName === "string") {
    //            var src = source.trim().toLowerCase();
    //            if (src === 'false') {
    //                return false;
    //            } else if (src === "true") {
    //                return true;
    //            } else {
    //                return source;
    //            }
    //        } else {
    //            return oldFn(source, sourceTypeName);
    //        }
    //    };
    //    DataType.Boolean.parse = newFn;

    //});

    test("datatype coercion - null strings to empty strings", function () {
        var em = newEm(); // new empty EntityManager
        var oldFn = DataType.String.parse;
        var newFn = function (source, sourceTypeName) {
            if (source == null) {
                return "";
            } else if (sourceTypeName === "string") {
                return source.trim();
            } else {
                return source.toString();
            }
        };
        DataType.String.parse = newFn;
        try {
            var aType = em.metadataStore.getEntityType("Customer");
            // OrderID, UnitPrice, Discount
            var inst = aType.createEntity();
            var val;
            inst.setProperty("companyName", null);
            val = inst.getProperty("companyName");
            ok(val === "");

            inst.setProperty("companyName", undefined);
            val = inst.getProperty("companyName");
            ok(val === "");

            inst.setProperty("companyName", "    now is the time    ");
            val = inst.getProperty("companyName");
            ok(val === "now is the time");
        } finally {
            DataType.String.parse = oldFn;
        }
    });


    test("datatype coercion - date", function () {
        var em = newEm(); // new empty EntityManager
        var userType = em.metadataStore.getEntityType("User");

        var user = userType.createEntity();
        var dt = new Date(2000, 2, 15); // 2 => 3 below because date ctor is 0 origin on months.
        user.setProperty("createdDate", "3/15/2000");
        var sameDt = user.getProperty("createdDate");
        ok(dt.getTime() === sameDt.getTime());
        user.setProperty("modifiedDate", dt.getTime());
        var sameDt2 = user.getProperty("modifiedDate");
        ok(dt.getTime() === sameDt2.getTime());

    });

    test("datatype coercion - integer", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - OrderDetail is not an entity");
            return;
        }
        var em = newEm(); // new empty EntityManager
        var odType = em.metadataStore.getEntityType("OrderDetail");
        // OrderID, UnitPrice, Discount
        var od = odType.createEntity();
        var val;
        od.setProperty("orderID", "3.4");
        val = od.getProperty("orderID");
        ok(val === 3);

        od.setProperty("orderID", 3.4);
        val = od.getProperty("orderID");
        ok(val === 3);



    });

    test("datatype coercion - decimal", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - OrderDetail is not an entity");
            return;
        }
        var em = newEm(); // new empty EntityManager
        var odType = em.metadataStore.getEntityType("OrderDetail");
        // OrderID, UnitPrice, Discount
        var od = odType.createEntity();
        var val;
        od.setProperty("unitPrice", "3.4");
        val = od.getProperty("unitPrice");
        ok(val === 3.4);

        od.setProperty("unitPrice", "3");
        val = od.getProperty("unitPrice");
        ok(val === 3);

        od.setProperty("unitPrice", 3.4);
        val = od.getProperty("unitPrice");
        ok(val === 3.4);

    });

    test("datatype coercion - float", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - OrderDetail issues");
            return true;
        }
        var em = newEm(); // new empty EntityManager
        var odType = em.metadataStore.getEntityType("OrderDetail");
        // OrderID, UnitPrice, Discount
        var od = odType.createEntity();
        var val;
        od.setProperty("discount", "3.4");
        val = od.getProperty("discount");
        ok(val === 3.4);

        od.setProperty("discount", "3");
        val = od.getProperty("discount");
        ok(val === 3);

        od.setProperty("discount", 3.4);
        val = od.getProperty("discount");
        ok(val === 3.4);

    });




    test("create entity with non-null dates", function () {
        var em = newEm(); // new empty EntityManager
        var userType = em.metadataStore.getEntityType("User");

        var user = userType.createEntity();

        var crtnDate = user.getProperty("createdDate");
        var modDate = user.getProperty("modifiedDate");
        ok(core.isDate(crtnDate), "crtnDate is not a date");
        ok(core.isDate(modDate), "modDate is not a date");
        em.addEntity(user);
        // need to do this after the addEntity call
        var id = user.getProperty(testFns.userKeyName);
        var exported = em.exportEntities();
        var em2 = newEm();
        em2.importEntities(exported);
        var user2 = em2.getEntityByKey("User", id);
        var crtnDate2 = user2.getProperty("createdDate");
        var modDate2 = user2.getProperty("modifiedDate");
        ok(core.isDate(crtnDate2), "crtnDate2 is not a date");
        ok(core.isDate(modDate2), "modDate2 is not a date");
        ok(crtnDate2.getTime() == crtnDate.getTime(), "crtn dates are not equal");
        ok(modDate2.getTime() == modDate.getTime(), "mod dates are not equal");
    });


    // TODO: Add back later when this table is added.

    //test("multipart foreign keys", function () {
    //    var em = newEm(); // new empty EntityManager
    //    var bodType = em.metadataStore.getEntityType("BonusOrderDetailItem");
    //    stop();
    //    EntityQuery.from("OrderDetails").take(1).using(em).execute().then(function (data) {
    //        var orderDetail = data.results[0];
    //        var bod = bodType.createEntity();
    //        bod.setProperty("bonusOrderDetailItemID", core.getUuid());
    //        bod.setProperty("orderDetail", orderDetail);
    //        var orderId = bod.getProperty("orderID");
    //        ok(orderId === orderDetail.getProperty("orderID"), "orderId's should be the same");
    //        var productId = bod.getProperty("productID");
    //        ok(productId === orderDetail.getProperty("productID"), "productId's should be the same");
    //    }).fail(testFns.handleFail).fin(start);


    //});

    test("create entity with initial properties", function () {
        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var cfg = {
            firstName: "John",
            lastName: "Smith"
        }
        var testVal;
        if (testFns.DEBUG_MONGO) {
            testVal = "FakeKey-42";
        } else {
            testVal = 42;
        }
        cfg[testFns.employeeKeyName] = wellKnownData.dummyEmployeeID;
        var employee = empType.createEntity(cfg);
        ok(employee.getProperty("firstName") === "John", "first name should be 'John'");
        ok(employee.getProperty(testFns.employeeKeyName) === wellKnownData.dummyEmployeeID, "employeeID should be " + wellKnownData.dummyEmployeeID);
       
        cfg = {
            firstxame: "John",
            lastName: "Smith"
        }
        cfg[testFns.employeeKeyName] = wellKnownData.dummyEmployeeID;
        var partialEmp = empType.createEntity(cfg);
        ok(employee.getProperty("lastName") === "Smith", "lastName should be 'Smith'");
    });

    test("acceptChanges - detach deleted", 1, function () {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity(); // created but not attached
        employee.setProperty(testFns.employeeKeyName, 42);
        em.attachEntity(employee); // simulate existing employee

        employee.entityAspect.setDeleted();
        employee.entityAspect.acceptChanges(); // simulate post-save state
        //em.acceptChanges(); // this works too ... for all changed entities in cache

        ok(employee.entityAspect.entityState.isDetached(),
            'employee should be "Detached" after calling acceptChanges');
    });

    test("rejectChanges notification", function () {
        //1) attach propertyChangedHandler to an existing entity
        //2) modify entity (handler hears it, and reports that the entity is "Modified")
        //3) entity.entityAspect.rejectChanges()
        //4) handler hears it ... but reports "Modified" rather than "Unchanged"
        var em = newEm();

        var orderType = em.metadataStore.getEntityType("Order");
        var order = orderType.createEntity();
        order.setProperty(testFns.orderKeyName, 1);
        em.attachEntity(order);
        var es;
        var count = 0;
        var lastArgs;
        var entity;
        order.entityAspect.propertyChanged.subscribe(function (args) {
            count++;
            lastArgs = args;
        });
        order.setProperty("freight", 55.55);
        ok(count === 1, "count should be 1");
        ok(lastArgs.entity === order, "entity should be order");
        ok(lastArgs.propertyName === "freight", "property name should be 'freight'");
        ok(lastArgs.entity.entityAspect.entityState.isModified(), "entityState should be modified");
        order.entityAspect.rejectChanges();
        ok(count === 2, "count should be 2");
        ok(lastArgs.entity === order, "entity should be order");
        ok(lastArgs.propertyName === null, "property name should be null");
        ok(lastArgs.entity.entityAspect.entityState.isUnchanged(), "entityState should be unchanged");

    });

    test("rejectChanges of a child entity restores it to its parent", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }
        var em = newEm();

        var orderType = em.metadataStore.getEntityType("Order");
        var parent = orderType.createEntity();
        parent.setProperty("orderID", 1);
        em.attachEntity(parent);

        var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
        var child = orderDetailType.createEntity();
        child.setProperty("orderID", 42);
        child.setProperty("order", parent); // adds child to parent's manager
        child.entityAspect.setUnchanged();

        // parent and child are now unchanged ... as if freshly queried
        ok(!em.hasChanges(),
            "manager should not have unsaved changes before delete");

        child.entityAspect.setDeleted();

        equal(parent.getProperty("orderID"), child.getProperty("orderID"),
            "child's still has parent's FK Id after delete");
        ok(null === child.getProperty("order"), // Bug? Should deleted child still have parent?
            "deleted child cannot navigate to former parent after delete");
        equal(parent.getProperty("orderDetails").length, 0,
            "parent no longer has the chile after child delete");

        em.rejectChanges();

        ok(!em.hasChanges(),
            "manager should not have unsaved changes after rejectChanges");
        equal(parent.getProperty("orderID"), child.getProperty("orderID"),
            "child's still has parent's FK Id after rejectChanges");
        ok(parent === child.getProperty("order"),
            "child can navigate to parent after rejectChanges");
        ok(parent.getProperty("orderDetails")[0] === child,
            "parent has child after rejectChanges");
    });


    test("custom Customer type with createEntity", function () {
        var em = newEm(newMs());

        var Customer = testFns.models.CustomerWithMiscData();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        em.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em.fetchMetadata().then(function () {
            var custType = em.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isDetached(), "should be detached");
            em.attachEntity(cust1);
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isUnchanged(), "should be unchanged");
            ok(cust1.getProperty("miscData") === "asdf");
            cust1.setProperty("companyName", "testxxx");
            ok(cust1.getNameLength() === 7, "getNameLength should be 7");
        }).fail(testFns.handleFail).fin(start);
    });

    test("custom Customer type with ES5 props and createEntity", function () {
        var em = newEm(newMs());

        var Customer = testFns.models.CustomerWithES5Props();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        em.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em.fetchMetadata().then(function () {
            var custType = em.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isDetached(), "should be detached");
            em.attachEntity(cust1);
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isUnchanged(), "should be unchanged");
            ok(cust1.getProperty("miscData") === "asdf");
            cust1.setProperty("companyName", "testxxx");
            var custName = cust1.getProperty("companyName");
            ok(custName === "TESTXXX", "should be all uppercase");
            ok(cust1.getNameLength() === 7, "getNameLength should be 7");
        }).fail(testFns.handleFail).fin(start);
    });

    test("custom Customer type with new", function () {
        var em = newEm(newMs());

        var Customer = testFns.models.CustomerWithMiscData();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        em.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em.fetchMetadata().then(function () {
            var custType = em.metadataStore.getEntityType("Customer");
            var cust1 = new Customer();
            // this works because the fetchMetadataStore hooked up the entityType on the registered ctor.
            ok(cust1.entityType === custType, "entityType should be undefined");
            ok(cust1.entityAspect === undefined, "entityAspect should be undefined");
            em.attachEntity(cust1);
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isUnchanged(), "should be unchanged");
            ok(cust1.getProperty("miscData") === "asdf");
            cust1.setProperty("companyName", "testxxx");
            ok(cust1.getNameLength() === 7, "getNameLength should be 7");
        }).fail(testFns.handleFail).fin(start);
    });

    test("custom Customer type with ES5 props and new", function () {
        var em = newEm(newMs());

        var Customer = testFns.models.CustomerWithES5Props();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        // register before fetchMetadata
        em.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em.fetchMetadata().then(function () {
            var custType = em.metadataStore.getEntityType("Customer");
            var cust1 = new Customer();
            // this works because the fetchMetadataStore hooked up the entityType on the registered ctor.
            ok(cust1.entityType === custType, "entityType should be undefined");
            ok(cust1.entityAspect === undefined, "entityAspect should be undefined");
            em.attachEntity(cust1);
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isUnchanged(), "should be unchanged");
            ok(cust1.getProperty("miscData") === "asdf");
            cust1.setProperty("companyName", "testxxx");
            var custName = cust1.getProperty("companyName");
            ok(custName === "TESTXXX", "should be all uppercase");
            ok(cust1.getNameLength() === 7, "getNameLength should be 7");
        }).fail(testFns.handleFail).fin(start);
    });


    test("custom Customer type with new - v2", function () {
        var em = newEm(newMs());

        var Customer = testFns.models.CustomerWithMiscData();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        stop();
        // register after fetchMetadata
        em.fetchMetadata().then(function () {
            em.metadataStore.registerEntityTypeCtor("Customer", Customer);
            var custType = em.metadataStore.getEntityType("Customer");
            var cust1 = new Customer();
            // this works because the fetchMetadataStore hooked up the entityType on the registered ctor.
            ok(cust1.entityType === custType, "entityType should be undefined");
            ok(cust1.entityAspect === undefined, "entityAspect should be undefined");
            em.attachEntity(cust1);
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isUnchanged(), "should be unchanged");
            ok(cust1.getProperty("miscData") === "asdf");
            cust1.setProperty("companyName", "testxxx");
            ok(cust1.getNameLength() === 7, "getNameLength should be 7");
        }).fail(testFns.handleFail).fin(start);
    });

    test("custom Customer type with ES5 proand and new - v2", function () {
        var em = newEm(newMs());

        var Customer = testFns.models.CustomerWithES5Props();
        Customer.prototype.getNameLength = function () {
            return (this.getProperty("companyName") || "").length;
        };

        stop();
        // register after fetchMetadata
        em.fetchMetadata().then(function () {
            em.metadataStore.registerEntityTypeCtor("Customer", Customer);
            var custType = em.metadataStore.getEntityType("Customer");
            var cust1 = new Customer();
            // this works because the fetchMetadataStore hooked up the entityType on the registered ctor.
            ok(cust1.entityType === custType, "entityType should be undefined");
            ok(cust1.entityAspect === undefined, "entityAspect should be undefined");
            em.attachEntity(cust1);
            ok(cust1.entityType === custType, "entityType should be Customer");
            ok(cust1.entityAspect.entityState.isUnchanged(), "should be unchanged");
            ok(cust1.getProperty("miscData") === "asdf");
            cust1.setProperty("companyName", "testxxx");
            var custName = cust1.getProperty("companyName");
            ok(custName === "TESTXXX", "should be all uppercase");
            ok(cust1.getNameLength() === 7, "getNameLength should be 7");
        }).fail(testFns.handleFail).fin(start);
    });

    test("entityState", function () {
        stop();
        runQuery(newEm(), function (customers) {
            var c = customers[0];
            testEntityState(c);
        }).fail(testFns.handleFail).fin(start);
    });


    test("entityType.getProperty nested", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }
        var odType = testFns.metadataStore.getEntityType("OrderDetail");
        var orderType = testFns.metadataStore.getEntityType("Order");

        var customerProp = odType.getProperty("order.customer");
        var customerProp2 = orderType.getProperty("customer");
        ok(customerProp, "should not be null");
        ok(customerProp == customerProp2, "should be the same prop");
        var prop1 = odType.getProperty("order.customer.companyName");
        var prop2 = orderType.getProperty("customer.companyName");
        ok(prop1, "should not be null");
        ok(prop1 == prop2, "should be the same prop");
    });

    test("entityCtor materialization with js ctor", function () {
        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(newMs());
        var Customer = testFns.models.CustomerWithMiscData();

        em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        runQuery(em1, function (customers) {
            var c = customers[0];
            ok(c.getProperty("miscData") === "asdf", "miscData property should contain 'asdf'");
            testEntityState(c);
        }).fail(testFns.handleFail).fin(start);
    });

    test("entityCtor materialization with ES5 ctor", function () {
        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(newMs());
        var Customer = testFns.models.CustomerWithES5Props();

        em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        runQuery(em1, function (customers) {
            var cust1 = customers[0];
            ok(cust1.getProperty("miscData") === "asdf", "miscData property should contain 'asdf'");
            var custName = cust1.getProperty("companyName");
            ok(custName.length > 1, "should have a companyName");
            ok(custName.toUpperCase() === custName, "should be all uppercase");
            testEntityState(cust1, true);
        }).fail(testFns.handleFail).fin(start);
    });


    test("unmapped import export", function () {

        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(newMs());
        var Customer = testFns.models.CustomerWithMiscData();
        em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em1.fetchMetadata().then(function () {
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust = custType.createEntity();
            em1.addEntity(cust);
            cust.setProperty("companyName", "foo2");
            cust.setProperty("miscData", "zzz");
            var bundle = em1.exportEntities();
            var em2 = new EntityManager({ serviceName: testFns.serviceName, metadataStore: em1.metadataStore });
            em2.importEntities(bundle);
            var entities = em2.getEntities();
            ok(entities.length === 1);
            var sameCust = entities[0];
            var cname = sameCust.getProperty("companyName");
            ok(cname === "foo2", "companyName should === 'foo2'");
            var miscData = sameCust.getProperty("miscData");
            ok(miscData === "zzz", "miscData should === 'zzz'");
        }).fail(testFns.handleFail).fin(start);
    });

    test("unmapped import export with ES5 props", function () {

        // use a different metadata store for this em - so we don't polute other tests
        var em1 = newEm(newMs());
        var Customer = testFns.models.CustomerWithES5Props();
        em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
        stop();
        em1.fetchMetadata().then(function () {
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust = custType.createEntity();
            em1.addEntity(cust);
            cust.setProperty("companyName", "foo2");
            var cname = cust.getProperty("companyName");
            ok(cname === "FOO2", "companyName should === 'FOO2'");
            cust.setProperty("miscData", "zzz");
            var bundle = em1.exportEntities();
            var em2 = new EntityManager({ serviceName: testFns.serviceName, metadataStore: em1.metadataStore });
            em2.importEntities(bundle);
            var entities = em2.getEntities();
            ok(entities.length === 1);
            var sameCust = entities[0];
            var cname2 = sameCust.getProperty("companyName");
            ok(cname2 === "FOO2", "companyName should === 'FOO2'");
            var miscData = sameCust.getProperty("miscData");
            ok(miscData === "zzz", "miscData should === 'zzz'");
        }).fail(testFns.handleFail).fin(start);
    });

    test("generate ids", function () {
        var orderType = testFns.metadataStore.getEntityType("Order");
        var em = newEm();
        var count = 10;
        for (var i = 0; i < count; i++) {
            var ent = orderType.createEntity();
            em.addEntity(ent);
        }
        var tempKeys = em.keyGenerator.getTempKeys();
        ok(tempKeys.length == count);
        tempKeys.forEach(function (k) {
            ok(em.keyGenerator.isTempKey(k), "This should be a temp key: " + k.toString());
        });
    });

    test("createEntity and check default values", function () {
        var et = testFns.metadataStore.getEntityType("Customer");
        checkDefaultValues(et);
        var entityTypes = testFns.metadataStore.getEntityTypes();
        entityTypes.forEach(function (et) {
            checkDefaultValues(et);
        });
    });

    test("propertyChanged", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }

        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        ok(orderType);
        var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
        ok(orderDetailType);
        var order = orderType.createEntity();
        var lastProperty, lastOldValue, lastNewValue;
        order.entityAspect.propertyChanged.subscribe(function (args) {
            ok(args.entity === order, "args.entity === order");
            lastProperty = args.propertyName;
            lastOldValue = args.oldValue;
            lastNewValue = args.newValue;
        });
        var order2 = orderType.createEntity();

        order.setProperty("employeeID", 1);
        order2.setProperty("employeeID", 999); // should not raise event
        ok(lastProperty === "employeeID");
        ok(lastNewValue === 1);
        order.setProperty("freight", 123.34);
        ok(lastProperty === "freight");
        ok(lastNewValue === 123.34);
        order.setProperty("shippedDate", new Date(2000, 1, 1));
        ok(lastProperty === "shippedDate");
        ok(lastNewValue.toDateString() == new Date(2000, 1, 1).toDateString());

        order.setProperty("employeeID", 2);
        ok(lastProperty === "employeeID");
        ok(lastNewValue === 2);
        ok(lastOldValue === 1);
    });

    test("propertyChanged unsubscribe", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        ok(orderType);
        var order = orderType.createEntity();
        var lastProperty, lastOldValue, lastNewValue;
        var key = order.entityAspect.propertyChanged.subscribe(function (args) {
            lastProperty = args.propertyName;
            lastOldValue = args.oldValue;
            lastNewValue = args.newValue;
        });
        order.setProperty(testFns.orderKeyName, wellKnownData.dummyOrderID);
        ok(lastProperty === testFns.orderKeyName);
        ok(lastNewValue === wellKnownData.dummyOrderID);
        order.entityAspect.propertyChanged.unsubscribe(key);
        order.setProperty("employeeID", wellKnownData.dummyEmployeeID);
        ok(lastProperty === testFns.orderKeyName);
        ok(lastNewValue === wellKnownData.dummyOrderID);
    });

    test("propertyChanged on query", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        ok(empType);
        var emp = empType.createEntity();
        emp.setProperty(testFns.employeeKeyName, wellKnownData.nancyID);
        var changes = [];
        emp.entityAspect.propertyChanged.subscribe(function (args) {
            changes.push(args);
        });
        em.attachEntity(emp);
        // now fetch
        var q = EntityQuery.fromEntities(emp);
        var uri = q._toUri(em.metadataStore);
        stop();
        em.executeQuery(q, function (data) {
            ok(changes.length === 1, "query merges should only fire a single property change");
            ok(changes[0].propertyName === null, "propertyName should be null on a query merge");
        }).fail(testFns.handleFail).fin(start);
    });

    test("propertyChanged suppressed on query", function () {
        var em = newEm();
        var empType = em.metadataStore.getEntityType("Employee");
        ok(empType);
        var emp = empType.createEntity();
        emp.setProperty(testFns.employeeKeyName, wellKnownData.nancyID);
        var changes = [];
        emp.entityAspect.propertyChanged.subscribe(function (args) {
            changes.push(args);
        });
        Event.enable("propertyChanged", em, false);
        em.attachEntity(emp);
        // now fetch
        var q = EntityQuery.fromEntities(emp);
        stop();
        em.executeQuery(q, function (data) {
            ok(changes.length === 0, "query merges should not fire");
        }).fail(testFns.handleFail).fin(start);
    });

    test("delete entity - check children", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }

        var em = newEm();
        var order = createOrderAndDetails(em);
        var details = order.getProperty("orderDetails");
        var copyDetails = details.slice(0);
        ok(details.length > 0, "order should have details");
        order.entityAspect.setDeleted();
        ok(order.entityAspect.entityState.isDeleted(), "order should be deleted");

        ok(details.length === 0, "order should now have no details");

        copyDetails.forEach(function (od) {
            ok(od.getProperty("order") === null, "orderDetail.order should not be set");
            var defaultOrderId = od.entityType.getProperty("orderID").defaultValue;
            ok(od.getProperty("orderID") === defaultOrderId, "orderDetail.orderId should not be set");
            ok(od.entityAspect.entityState.isModified(), "orderDetail should be 'modified");
        });
    });

    test("delete entity - check parent", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }

        var em = newEm();
        var order = createOrderAndDetails(em);
        var details = order.getProperty("orderDetails");
        var od = details[0];
        ok(details.indexOf(od) !== -1);
        var copyDetails = details.slice(0);
        ok(details.length > 0, "order should have details");
        od.entityAspect.setDeleted();
        ok(od.entityAspect.entityState.isDeleted(), "orderDetail should be deleted");

        ok(details.length === copyDetails.length - 1, "order should now have 1 less detail");
        ok(details.indexOf(od) === -1);

        ok(od.getProperty("order") === null, "orderDetail.order should not be set");
        var defaultOrderId = od.entityType.getProperty("orderID").defaultValue;
        // we deliberately leave the orderID alone after a delete - we are deleting the entity and do not want a 'mod' to cloud the issue
        // ( but we do 'detach' the Order itself.)
        ok(od.getProperty("orderID") === order.getProperty("orderID"), "orderDetail.orderId should not change as a result of being deleted");
    });

    test("detach entity - check children", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }

        var em = newEm();
        var order = createOrderAndDetails(em);
        var orderId = order.getProperty(testFns.orderKeyName);
        var details = order.getProperty("orderDetails");
        var copyDetails = details.slice(0);
        ok(details.length > 0, "order should have details");
        em.detachEntity(order);
        ok(order.entityAspect.entityState.isDetached(), "order should be detached");

        ok(details.length === 0, "order should now have no details");

        copyDetails.forEach(function (od) {
            ok(od.getProperty("order") === null, "orderDetail.order should not be set");
            ok(od.getProperty(testFns.orderKeyName) === orderId, "orderDetail.orderId should not have changed");
            ok(od.entityAspect.entityState.isUnchanged(), "orderDetail should be 'modified");
        });
    });

    test("hasChanges", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }

        var em = newEm();

        var orderType = em.metadataStore.getEntityType("Order");
        var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
        var order1 = createOrderAndDetails(em, false);
        var order2 = createOrderAndDetails(em, false);

        var valid = em.hasChanges();
        ok(valid, "should have some changes");
        try {
            var x = em.hasChanges("order");
            ok(false, "should have failed");
        } catch (e) {
            ok(e.message.indexOf("order") != -1, " should have an error message about 'order'");
        }
        valid = em.hasChanges("Order");
        ok(valid, "should have changes for Orders");
        try {
            var y = em.hasChanges(["Order", "OrderDetXXX"]);
            ok(false, "should have failed");
        } catch (e) {
            ok(e.message.indexOf("OrderDetXXX") != -1, " should have an error message about 'order'");
        }
        valid = em.hasChanges([orderType, orderDetailType]);
        ok(valid, "should have changes for Orders or OrderDetails");
        em.getChanges(orderType).forEach(function (e) {
            e.entityAspect.acceptChanges();
        });
        valid = !em.hasChanges(orderType);
        ok(valid, "should not have changes for Orders");
        valid = em.hasChanges("OrderDetail");
        ok(valid, "should still have changes for OrderDetails");
        em.getChanges(orderDetailType).forEach(function (e) {
            e.entityAspect.acceptChanges();
        });

        valid = !em.hasChanges(["Order", "OrderDetail"]);
        ok(valid, "should no longer have changes for Orders or OrderDetails");
        valid = !em.hasChanges();
        ok(valid, "should no longer have any changes");
    });

    test("rejectChanges", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for MONGO - OrderDetail issues");
            return true;
        }

        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
        var order1 = createOrderAndDetails(em, false);
        var order2 = createOrderAndDetails(em, false);

        var valid = em.hasChanges();
        ok(valid, "should have some changes");
        valid = em.hasChanges(orderType);
        ok(valid, "should have changes for Orders");
        valid = em.hasChanges([orderType, orderDetailType]);
        ok(valid, "should have changes for Orders or OrderDetails");
        em.getChanges(orderType).forEach(function (e) {
            e.entityAspect.acceptChanges();
            e.setProperty("freight", 100);
            ok(e.entityAspect.entityState.isModified(), "should be modified");
        });
        var rejects = em.rejectChanges();
        ok(rejects.length > 0, "should have rejected some");
        var hasChanges = em.hasChanges(orderType);
        ok(!hasChanges, "should not have changes for Orders");
        hasChanges = em.hasChanges(orderDetailType);
        ok(!hasChanges, "should not have changes for OrderDetails");

        valid = !em.hasChanges();
        ok(valid, "should no longer have any changes");
    });


    function createOrderAndDetails(em, shouldAttachUnchanged) {
        if (shouldAttachUnchanged === undefined) shouldAttachUnchanged = true;
        var metadataStore = em.metadataStore;
        var orderType = em.metadataStore.getEntityType("Order");
        var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
        var order = orderType.createEntity();
        ok(order.entityAspect.entityState.isDetached(), "order should be 'detached");
        for (var i = 0; i < 3; i++) {
            var od = orderDetailType.createEntity();
            od.setProperty("productID", i + 1); // part of pk
            order.getProperty("orderDetails").push(od);
            ok(od.entityAspect.entityState.isDetached(), "orderDetail should be 'detached");
        }
        var orderId;
        if (shouldAttachUnchanged) {
            em.attachEntity(order);
            orderId = order.getProperty("orderID");
            order.getProperty("orderDetails").forEach(function (od) {
                ok(od.getProperty("order") === order, "orderDetail.order not set");
                ok(od.getProperty("orderID") === orderId, "orderDetail.orderId not set");
                ok(od.entityAspect.entityState.isUnchanged(), "orderDetail should be 'unchanged");
            });
        } else {
            em.addEntity(order);
            orderId = order.getProperty("orderID");
            order.getProperty("orderDetails").forEach(function (od) {
                ok(od.getProperty("order") === order, "orderDetail.order not set");
                ok(od.getProperty("orderID") === orderId, "orderDetail.orderId not set");
                ok(od.entityAspect.entityState.isAdded(), "orderDetail should be 'added");
            });
        }
        return order;
    }


    function runQuery(em, callback) {

        var query = new EntityQuery()
            .from("Customers")
            .where("companyName", "startsWith", "C")
            .orderBy("companyName");

        return em.executeQuery(query).then(function (data) {
            callback(data.results);
        });
    }

    function testEntityState(c, isES5) {
        var testVal = isES5 ? "TEST" : "Test";
        var test2Val = isES5 ? "TEST2" : "Test2";
        ok(c.getProperty("companyName"), 'should have a companyName property');
        ok(c.entityAspect.entityState.isUnchanged(), "should be unchanged");
        c.setProperty("companyName", "Test");
        ok(c.getProperty("companyName") === testVal, "companyName should be 'Test'");
        ok(c.entityAspect.entityState.isModified(), "should be modified after change");
        c.entityAspect.acceptChanges();
        ok(c.entityAspect.entityState.isUnchanged(), "should be unchanged after acceptChanges");

        c.setProperty("companyName", "Test2");
        ok(c.getProperty("companyName") === test2Val, "companyName should be 'Test2'");
        ok(c.entityAspect.entityState.isModified(), "should be modified after change");
        c.entityAspect.rejectChanges();
        ok(c.getProperty("companyName") === testVal, "companyName should be 'Test' after rejectChanges");
        ok(c.entityAspect.entityState.isUnchanged(), "should be unchanged after reject changes");
    }

    function checkDefaultValues(structType) {
        var props = structType.getProperties();
        ok(props.length, "No data properties for structType: " + structType.name);
        var fn = structType.createEntity || structType.createInstance;
        var entity = fn.apply(structType);
        props.forEach(function (p) {
            var v = entity.getProperty(p.name);
            if (p.isUnmapped) {
                // do nothing
            } else if (p.isDataProperty) {
                if (p.isScalar) {
                    if (p.isComplexProperty) {
                        ok(v !== null, core.formatString("'%1': prop: '%2' - was null",
                            structType.name, p.name));
                    } else if (p.defaultValue != null) {
                        ok(v === p.defaultValue, core.formatString("'%1': prop: '%2' - was: '%3' - should be defaultValue: '%4'",
                            structType.name, p.name, v, p.defaultValue));
                    } else if (p.isNullable) {
                        ok(v === null, core.formatString("'%1': prop: '%2' - was: '%3' - should be null",
                            structType.name, p.name, v));
                    }
                } else {
                    ok(v.arrayChanged, "value should be a complex array or primitive array");
                }
            } else {
                if (p.isScalar) {
                    ok(v === null, core.formatString("'%1': prop: '%2' - was: '%3' - should be null",
                        structType.name, p.name, v));
                } else {
                    ok(v.arrayChanged, "value should be a relation array");
                }
            }
        });
    }

   

})(breezeTestFns);