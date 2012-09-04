require.config({ baseUrl: "Scripts/IBlade" });
define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;

    var Enum = core.Enum;

    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityQuery = entityModel.EntityQuery;
    var EntityKey = entityModel.EntityKey;
    var EntityState = entityModel.EntityState;


    var metadataStore = new MetadataStore();
    var newEm = function () {
        return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: metadataStore });
    };

    module("attach", {
        setup: function () {
            if (!metadataStore.isEmpty()) return;
            stop();
            var em = newEm();
            em.fetchMetadata(function (rawMetadata) {
                var isEmptyMetadata = metadataStore.isEmpty();
                ok(!isEmptyMetadata);
                start();
            });
        },
        teardown: function () {

        }
    });
    
     test("rejectChanges on added entity", function () {
        var em = newEm();
        var typeInfo = em.metadataStore.getEntityType("Order");
        var newEntity = typeInfo.createEntity();
        em.addEntity(newEntity);

        var entityState = newEntity.entityAspect.entityState;
        ok(entityState.isAdded(),
            "newEntity should be in Added state; is "+entityState);

        newEntity.entityAspect.rejectChanges();
     
        entityState = newEntity.entityAspect.entityState;
        ok(entityState.isDetached(),
            "newEntity should be Detached after rejectChanges; is "+entityState);

        ok(!em.hasChanges(), "should not have changes");

        var inCache = em.getEntities(), count = inCache.length;
        ok(count == 0, "should have no entities in cache; have " + count);

    });
    
    test("delete added entity", 3, function () {
        var em = newEm();
        var typeInfo = em.metadataStore.getEntityType("Order");
        var newEntity = typeInfo.createEntity();
        em.addEntity(newEntity);

        ok(newEntity.entityAspect.entityState.isAdded(),
            "new Todo added to cache is in 'added' state");

        newEntity.entityAspect.setDeleted();

        ok(newEntity.entityAspect.entityState.isDetached(),  // FAIL
            "new Todo added to cache is 'detached'");  
        
        // get the first (and only) entity in cache
        equal(em.getEntities().length, 0, "no entities in cache"); //FAIL

    });


    test("add entity - no key", function () {
        var em = newEm();
        var odType = metadataStore.getEntityType("OrderDetail");
        var od = odType.createEntity();
        try {
            em.attachEntity(od);
            ok(false, "should not be able to attach an entity without setting its key");
        } catch (e) {
            ok(e.message.indexOf("key") >= 0, "error message should contain 'key'");
        }
        try {
            var cId = em.generateTempKeyValue(od);
            ok(false, "should not be able to generate a temp multipart key");
        } catch (e) {
            ok(e.message.indexOf("multipart keys") >= 0, "error message should contain 'multipart keys'");
        }
        // only need to set part of the key
        od.setProperty("OrderID", 999);
        em.attachEntity(od);
    });


    test("add child", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();

        em.addEntity(cust1);
        ok(cust1.entityAspect.entityState === EntityState.Added, "cust entityState should be added");
        ok(cust1.entityAspect.hasTempKey === true, "hasTempKey should be true");
        var orders = cust1.getProperty("Orders");

        var changeArgs = null;
        orders.arrayChanged.subscribe(function (args) {
            changeArgs = args;
        });
        orders.push(order1);
        ok(cust1.entityAspect.entityState === EntityState.Added, "cust entityState should be added");
        ok(order1.entityAspect.entityState === EntityState.Added, " order entityState should be added");
        ok(orders.parentEntity == cust1);
        var navProperty = cust1.entityType.getProperty("Orders");
        ok(orders.navigationProperty == navProperty);
        ok(changeArgs.added, "changeArgs not set");
        ok(changeArgs.added[0] === order1, "changeArgs added property not set correctly");
        var sameCust = order1.getProperty("Customer");
        ok(sameCust === cust1, "inverse relationship not setPropertiesd");
        
    });

    test("detach child", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();
        var order2 = orderType.createEntity();

        em.addEntity(cust1);
        ok(cust1.entityAspect.entityState === EntityState.Added, "cust entityState should be added");
        var orders = cust1.getProperty("Orders");
        orders.push(order1);
        orders.push(order2);
        var arrayChangeCount = 0;
        orders.arrayChanged.subscribe(function (args) {
            arrayChangeCount += 1;
            if (args.removed[0] !== order2) {
                ok(fail, "should not have gotten here");
            }
        });
        var order2ChangeCount = 0;
        order2.entityAspect.propertyChanged.subscribe(function (args2) {
            if (args2.propertyName === "Customer") {
                order2ChangeCount += 1;
            } else if (args2.propertyName === "CustomerID") {
                order2ChangeCount += 1;
            } else {
                ok("fail", "should not have gotten here");
            }
        });
        var orders2 = cust1.getProperty("Orders");
        ok(orders === orders2);
        var ix = orders.indexOf(order2);
        orders.splice(ix, 1);
        ok(orders.length === 1);
        ok(arrayChangeCount === 1, "arrayChangeCount should be 1");
        ok(order2ChangeCount === 2, "order2ChangeCount should be 2");

        var sameCust = order2.getProperty("Customer");
        ok(sameCust === null, "order2.Customer should now be null");
    });

    test("add parent", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();


        em.addEntity(order1);
        ok(order1.entityAspect.entityState.isAdded(), "order entityState should be added");
        var emptyCust = order1.getProperty("Customer");
        ok(!emptyCust);
        var changeArgs = null;
        order1.entityAspect.propertyChanged.subscribe(function (args) {
            changeArgs = args;
        });
        order1.setProperty("Customer", cust1);
        ok(order1.entityAspect.entityState.isAdded(), "order entityState should be added");
        ok(cust1.entityAspect.entityState.isAdded(), "customer entityState should be added");
        ok(changeArgs, "no property notification occured");
        ok(changeArgs.propertyName === "Customer");
        ok(changeArgs.newValue === cust1, "changeArgs.newValue not set correctly");
        ok(changeArgs.oldValue === null, "changeArgs.oldValue not set correctly");
        var orders = cust1.getProperty("Orders");
        ok(orders[0] == order1, "inverse relationship not setPropertiesd");

    });

    test("change parent (1-n)", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var cust2 = custType.createEntity();
        var order1 = orderType.createEntity();

        em.attachEntity(order1);
        ok(order1.entityAspect.entityState.isUnchanged(), "order1 should be 'unchanged'");
        order1.setProperty("Customer", cust1);
        ok(cust1.entityAspect.entityState.isAdded(), "cust1 should be 'added'");
        var cust1Orders = cust1.getProperty("Orders");
        ok(cust1Orders.length === 1, "There should be exactly one order in cust1Orders");
        ok(cust1Orders.indexOf(order1) >= 0, "order1 should be in cust1.Orders");

        // now change
        order1.setProperty("Customer", cust2);
        ok(cust2.entityAspect.entityState.isAdded(), "cust2 should be added");
        var cust2Orders = cust2.getProperty("Orders");
        ok(cust2Orders.length === 1, "There should be exactly one order in cust1Orders");
        ok(cust2Orders.indexOf(order1) >= 0, "order1 should be in cust2.Orders");
        ok(cust1Orders === cust1.getProperty("Orders"), "cust1.Orders should be the same collection object as that returned earlier")
        ok(cust1Orders.indexOf(order1) == -1, "order1 should no longer be in cust1.Orders");
        ok(order1.getProperty("Customer") == cust2, "order1.Customer should now be cust2");

    });

    test("change child (1-n)", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var cid1 = em.generateTempKeyValue(cust1);
        var cust2 = custType.createEntity();
        var cid2 = em.generateTempKeyValue(cust2);
        var order1 = orderType.createEntity();

        em.attachEntity(cust1);

        ok(cust1.entityAspect.entityState.isUnchanged(), "cust1 should be 'unchanged'");
        var cust1Orders = cust1.getProperty("Orders");
        cust1Orders.push(order1);
        ok(cust1Orders.length === 1, "There should be exactly one order in cust1Orders");

        ok(order1.entityAspect.entityState.isAdded(), "order1 should be 'added'");
        ok(cust1Orders.indexOf(order1) >= 0, "order1 should be in cust1.Orders");
        // now change
        var cust2Orders = cust2.getProperty("Orders");
        cust2Orders.push(order1);
        ok(cust2Orders.length === 1, "There should be exactly one order in cust2Orders");
        ok(cust1Orders.length === 0, "There should be no orders in cust1Orders")
        ok(cust2.entityAspect.entityState.isAdded(), "cust2 should be 'added'");
        ok(cust2Orders.indexOf(order1) >= 0, "order1 should be in cust2.Orders");
        ok(cust1Orders === cust1.getProperty("Orders"), "cust1.Orders should be the same collection object as that returned earlier");
        ok(cust1Orders.indexOf(order1) == -1, "order1 should no longer be in cust1.Orders");
        ok(order1.getProperty("Customer") == cust2, "order1.Customer should now be cust2");

    });

    test("graph attach (1-n) - setProperties child, attach child", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();

        order1.setProperty("Customer", cust1);
        em.attachEntity(order1);
        ok(order1.entityAspect.entityState === EntityState.Unchanged, "order entityState should be unchanged");
        ok(cust1.entityAspect.entityState === EntityState.Unchanged, "customer entityState should be unchanged");
        var orders = cust1.getProperty("Orders");
        ok(orders[0] == order1, "inverse relationship not setPropertiesd");
        ok(orders[0].getProperty("Customer") === cust1, "order.Customer not setPropertiesd");
    });

    test("graph attach (1-n)- setProperties child, attach parent", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();

        order1.setProperty("Customer", cust1);
        em.attachEntity(cust1);
        ok(order1.entityAspect.entityState === EntityState.Unchanged, "order entityState should be unchanged");
        ok(cust1.entityAspect.entityState === EntityState.Unchanged, "customer entityState should be unchanged");
        var orders = cust1.getProperty("Orders");
        ok(orders[0] == order1, "inverse relationship not setPropertiesd");
    });

    test("graph attach (1-n) - setProperties parent, attach parent", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();

        var cust1Orders = cust1.getProperty("Orders");
        cust1Orders.push(order1);
        ok(cust1Orders.length === 1, "There should be exactly one order in cust1Orders");
        em.attachEntity(cust1);
        ok(order1.entityAspect.entityState === EntityState.Unchanged, "order entityState should be unchanged");
        ok(cust1.entityAspect.entityState === EntityState.Unchanged, "customer entityState should be unchanged");
        ok(order1.getProperty("Customer") === cust1, "inverse relationship not setPropertiesd");
    });

    test("graph attach (1-n) - setProperties parent, attach child", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var order1 = orderType.createEntity();

        var cust1Orders = cust1.getProperty("Orders");
        cust1Orders.push(order1);
        ok(cust1Orders.length === 1, "There should be exactly one order in cust1Orders");
        em.attachEntity(order1);
        ok(order1.entityAspect.entityState === EntityState.Unchanged, "order entityState should be unchanged");
        ok(cust1.entityAspect.entityState === EntityState.Unchanged, "customer entityState should be unchanged");
        ok(order1.getProperty("Customer") === cust1, "inverse relationship not setPropertiesd");
    });


    test("graph attach (1-n) - piecewise", function () {
        var orderType = metadataStore.getEntityType("Order");
        var orderDetailType = metadataStore.getEntityType("OrderDetail");
        var em = newEm();
        var order = orderType.createEntity();
        ok(order.entityAspect.entityState.isDetached(), "order should be 'detached");
        em.attachEntity(order);
        var orderId = order.getProperty("OrderID");
        ok(orderId);
        ok(order.entityAspect.entityState.isUnchanged(), "order should be 'unchanged'");
        for (var i = 0; i < 3; i++) {
            var od = orderDetailType.createEntity();
            od.setProperty("ProductID", i + 1); // part of pk && not the default value
            order.getProperty("OrderDetails").push(od);
            ok(od.entityAspect.entityState.isAdded(), "orderDetail should be 'added");
            ok(od.getProperty("Order") === order, "orderDetail.order not set");
            ok(od.getProperty("OrderID") === orderId, "orderDetail.orderId not set");
        }
    });

    // TODO: will not yet work if both order and orderDetail keys are autogenerated.
    test("graph attach (1-n)- all together", function () {
        var orderType = metadataStore.getEntityType("Order");
        var orderDetailType = metadataStore.getEntityType("OrderDetail");
        var em = newEm();
        var order = orderType.createEntity();
        ok(order.entityAspect.entityState.isDetached(), "order should be 'detached");
        order.setProperty("OrderID", 999);

        for (var i = 0; i < 3; i++) {
            var od = orderDetailType.createEntity();
            od.setProperty("ProductID", i + 1); // part of pk and not the default value
            order.getProperty("OrderDetails").push(od);
            ok(od.entityAspect.entityState.isDetached(), "orderDetail should be 'detached");
        }
        em.attachEntity(order);
        var orderId = order.getProperty("OrderID");
        ok(orderId);
        ok(order.entityAspect.entityState.isUnchanged(), "order should be 'unchanged'");
        order.getProperty("OrderDetails").forEach(function (od) {
            ok(od.getProperty("Order") === order, "orderDetail.order not set");
            ok(od.getProperty("OrderID") === orderId, "orderDetail.orderId not set");
            ok(od.entityAspect.entityState.isUnchanged(), "orderDetail should be 'unchanged");
        });
    });

    test("graph attach (1-n) - all together - autogenerated", function () {
        var orderType = metadataStore.getEntityType("Order");
        var orderDetailType = metadataStore.getEntityType("OrderDetail");
        var em = newEm();
        var order = orderType.createEntity();
        ok(order.entityAspect.entityState.isDetached(), "order should be 'detached");
        // order.OrderID = 999;

        for (var i = 0; i < 3; i++) {
            var od = orderDetailType.createEntity();
            od.setProperty("ProductID", i); // part of pk
            order.getProperty("OrderDetails").push(od);
            ok(od.entityAspect.entityState.isDetached(), "orderDetail should be 'detached");
        }
        em.attachEntity(order);
        ok(order.entityAspect.entityState.isUnchanged(), "order should be 'unchanged'");
        var orderId = order.getProperty("OrderID");
        ok(orderId);
        order.getProperty("OrderDetails").forEach(function (od) {
            ok(od.getProperty("Order") === order, "orderDetail.order not set");
            ok(od.getProperty("OrderID") === orderId, "orderDetail.orderId not set");
            ok(od.entityAspect.entityState.isUnchanged(), "orderDetail should be 'unchanged");
        });
    });


    test("duplicate entity keys", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var cust2 = custType.createEntity();

        em.attachEntity(cust1);
        try {
            var cust1Id = cust1.getProperty("CustomerID");
            cust2.setProperty("CustomerID", cust1Id);
            em.attachEntity(cust2);
            ok(false, "should not be able to attach 2 entities with the same key");
        } catch (e) {
            ok(e.message.indexOf("key") >= 0);
        }

    });

    test("fk fixup - fk to nav - attached", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var cust2 = custType.createEntity();
        var order1 = orderType.createEntity();

        em.attachEntity(order1);
        em.attachEntity(cust1);
        var custIdValue = cust1.getProperty("CustomerID");
        order1.setProperty("CustomerID", custIdValue);
        var orderCustomer = order1.getProperty("Customer");
        ok(orderCustomer === cust1, "nav property fixup did not occur");

    });

    test("fk fixup - nav to fk - attached", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var cust2 = custType.createEntity();
        var order1 = orderType.createEntity();


        em.attachEntity(order1);
        em.attachEntity(cust1);

        order1.setProperty("Customer", cust1);
        var orderCustId = order1.getProperty("CustomerID");
        var custId = cust1.getProperty("CustomerID");
        ok(orderCustId === custId, "fk property fixup did not occur");

    });

    test("fk fixup - unattached children", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var c1Id = em.generateTempKeyValue(cust1);
        var cust2 = custType.createEntity();
        var order1 = orderType.createEntity();
        em.attachEntity(order1);
        ok(order1.entityAspect.entityState.isUnchanged(), "order1 entityState should be 'unchanged'");
        // assign an fk where the parent doesn't yet exist on  this em.
        order1.setProperty("CustomerID", c1Id);
        ok(order1.entityAspect.entityState.isModified(), "order1 entityState should be 'modfied'");
        order1.entityAspect.acceptChanges();
        ok(order1.entityAspect.entityState.isUnchanged(), "order1 entityState should be 'unchanged'");
        var order1Cust = order1.getProperty("Customer");
        ok(order1Cust == null, "order1.Customer should be null at this point.");
        em.attachEntity(cust1);
        order1Cust = order1.getProperty("Customer");
        ok(order1Cust !== null, "order1.Customer should have been fixed up");
        ok(order1.entityAspect.entityState.isUnchanged(), "fixup should not change the entity state");
    });

    test("fk fixup - unattached parent pushes attached child", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var orderType = metadataStore.getEntityType("Order");
        var cust1 = custType.createEntity();
        var c1Id = em.generateTempKeyValue(cust1);
        var cust2 = custType.createEntity();
        var order1 = orderType.createEntity();
        em.attachEntity(order1);
        ok(order1.entityAspect.entityState.isUnchanged(), "order1 entityState should be 'unchanged'");
        ok(cust1.entityAspect.entityState.isDetached(), "cust1 entityState should be 'detached'");
        var order1Cust = order1.getProperty("Customer");
        ok(order1Cust == null, "order1.Customer should be null at this point.");
        var cust1Orders = cust1.getProperty("Orders");
        cust1Orders.push(order1);
        ok(order1.entityAspect.entityState.isModified(), "order1 entityState should be 'modified'");
        ok(cust1.entityAspect.entityState.isAdded(), "order1 entityState should be 'added'");
        order1Cust = order1.getProperty("Customer");
        ok(order1Cust !== null, "order1.Customer should have been fixed up");
        var order1CustId = order1.getProperty("CustomerID");
        var custId = cust1.getProperty("CustomerID");
        ok(order1CustId === custId, "fk property fixup did not occur");

    });

    test("recursive navigation fixup", function () {
        var em = newEm();
        var empType = metadataStore.getEntityType("Employee");
        var emp1 = empType.createEntity();
        var emp2 = empType.createEntity();
        var emp3 = empType.createEntity();
        ok(emp1.entityAspect.entityState.isDetached(), "emp1 should be detached");
        ok(emp2.entityAspect.entityState.isDetached(), "emp2 should be detached");
        ok(emp3.entityAspect.entityState.isDetached(), "emp3 should be detached");
        emp2.setProperty("Manager", emp1);
        emp2.getProperty("DirectReports").push(emp3);
        em.attachEntity(emp3);
        ok(emp1.entityAspect.entityState.isUnchanged(), "emp1 should be unchanged");
        ok(emp2.entityAspect.entityState.isUnchanged(), "emp2 should be unchanged");
        ok(emp3.entityAspect.entityState.isUnchanged(), "emp3 should be unchanged");
        var emp1Id = emp1.getProperty("EmployeeID");
        var emp2Id = emp2.getProperty("EmployeeID");
        var emp3Id = emp3.getProperty("EmployeeID");
        ok(emp2.getProperty("ReportsToEmployeeID") === emp1Id, "emp2.ReportsTo... not set properly");
        ok(emp3.getProperty("ReportsToEmployeeID") === emp2Id, "emp2.ReportsTo... not set properly");
        ok(emp2.getProperty("DirectReports")[0] === emp3, "emp2.DirectReports not set properly");
        ok(emp1.getProperty("DirectReports")[0] === emp2, "emp1.DirectReports not set properly");

    });

    function output(inp) {
        document.body.appendChild(document.createElement('pre')).innerHTML = inp;
    }

    return testFns;
});