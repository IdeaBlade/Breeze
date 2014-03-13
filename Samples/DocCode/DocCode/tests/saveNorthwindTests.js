// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    // Classes we'll need from the breeze namespaces
    var EntityQuery = breeze.EntityQuery;
    var newGuidComb = testFns.newGuidComb;
    var handleSaveFailed = testFns.handleSaveFailed;

    /*********************************************************
    * Northwind Saves
    *********************************************************/
    // Target the Northwind service by default
    var northwindService = testFns.northwindServiceName;
    var newNorthwindEm = testFns.newEmFactory(northwindService);
   
    var alfredsID = testFns.wellKnownData.alfredsID;

    module("saveNorthwindTests", {
        setup: function () {
            testFns.populateMetadataStore(newNorthwindEm);
        },
        teardown: function () {
            testFns.teardown_northwindReset(); // restore original db state after each test
        }
    });

    asyncTest("can save a new Customer entity", 1, function () {
        // Create and initialize entity to save
        var em = newNorthwindEm();
        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: "Test1 " + new Date().toISOString()
        });

        entitySaveTester(customer, /*shouldSave*/ true);

    });
    
    asyncTest("can modify my own Customer entity", 2, function () {
        var timestamp = new Date().toISOString();
        var em = newNorthwindEm();
        
        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: "Test2A " + timestamp
        });

        em.saveChanges().then(modifyCustomer).fail(handleSaveFailed).fin(start);
        
        function modifyCustomer(saveResults) {
            var saved = saveResults.entities[0];
            ok(saved && saved === customer,
                "save of added customer should have succeeded");
            customer.CompanyName("Test2M " + timestamp);
            return em.saveChanges()
            .then(confirmCustomerSaved);
        }
        
        function confirmCustomerSaved(saveResults) {
            var saved = saveResults.entities[0];
            ok(saved && saved === customer,
                "save of modified customer, '{0}', should have succeeded"
                .format(saved && saved.CompanyName()));
        }

    });
    
    asyncTest("can delete my own Customer entity", 3, function () {
        var timestamp = new Date().toISOString();
        var em = newNorthwindEm();
        
        var customer = em.createEntity('Customer', {
            CustomerID: newGuidComb(),
            CompanyName: "Test3A " + timestamp
        });

        em.saveChanges().then(deleteCustomer).fail(handleSaveFailed).fin(start);

        function deleteCustomer(saveResults) {
            var saved = saveResults.entities[0];
            ok(saved && saved === customer,
                "save of added customer should have succeeded");
            customer.entityAspect.setDeleted();
            return em.saveChanges()
            .then(confirmCustomerSaved);
        }

        function confirmCustomerSaved(saveResults) {
            var saved = saveResults.entities[0];
            ok(saved && saved === customer,
                "save of deleted customer, '{0}', should have succeeded"
                .format(saved && saved.CompanyName()));
            
            var state = customer.entityAspect.entityState.name;
            equal(state, breeze.EntityState.Detached.name,
                "customer object should be 'Detached'");
        }

    });

    /*
     * This test removed when we made InternationalOrder a subclass of Order
     * Restore it if/when decide to demo IO as a separate entity related in 1..(0,1)
     * 
    asyncTest("can save a new Northwind Order & InternationalOrder [1..(0,1) relationship]", 2, function () {
        // Create and initialize entity to save
        var em = newNorthwindEm();

        var order = em.createEntity('Order', {
            CustomerID: testFns.wellKnownData.alfredsID,
            EmployeeID: testFns.wellKnownData.nancyID,
            ShipName: "Test " + new Date().toISOString()
        });

        var internationalOrder = em.createEntity('InternationalOrder', {
            Order: order, // sets OrderID and pulls it into the order's manager
            CustomsDescription: "rare, exotic birds"
        });

        em.saveChanges()
            .then(successfulSave).fail(handleSaveFailed).fin(start);

        function successfulSave(saveResults) {
            var orderId = order.OrderID();
            var internationalOrderID = internationalOrder.OrderID();

            equal(internationalOrderID, orderId,
                "the new internationalOrder should have the same OrderID as its new parent Order, " + orderId);
            ok(orderId > 0, "the OrderID is positive, indicating it is a permanent order");
        }

    });
     */

    asyncTest("delete of Product clears its related Category before save", 4, function () {
        var em = newNorthwindEm();

        EntityQuery.from('Products').top(1)
            .expand('Category')
            .using(em).execute()
            .then(doDelete).fail(handleSaveFailed).fin(start);

        function doDelete(data) {
            var product = data.results[0];
            ok(product != null, "should have a product");
            if (product) {
                // precondition
                ok(product.Category() !== null, "product should have a Category before delete");

                // ACT
                product.entityAspect.setDeleted();

                ok(product.Category() === null, "product should NOT have a Category after product deleted");
                // FKs of principle related entities are retained. Should they be cleared too?
                ok(product.CategoryID() !== 0, "product should have a non-zero CategoryID after product deleted");
            }
        }

    });
    
    asyncTest("delete of Order clears its related entities before save", 10, function () {
        var em = newNorthwindEm();

        EntityQuery.from('Orders').top(1)
            .expand('Customer, Employee, OrderDetails')
            .using(em).execute()
            .then(doDelete).fail(handleSaveFailed).fin(start);

        function doDelete(data) {
            var order = data.results[0];
            ok(order != null, "should have an order");
            if (order) {
                // precondition
                ok(order.Customer() !== null, "order should have a Customer before delete");
                ok(order.Employee() !== null, "order should have a Employee before delete");
                var details = order.OrderDetails();
                ok(details.length !== 0, "order should have OrderDetails before delete");

                // ACT
                order.entityAspect.setDeleted();

                // ASSERT
                ok(order.Customer() === null, "order should NOT have a Customer after order deleted");
                ok(order.Employee() === null, "order should NOT have a Employee after order deleted");
                ok(order.OrderDetails().length === 0,
                    "order should NOT have OrderDetails after order deleted");

                // FKs of principle related entities are retained. Should they be cleared too?
                ok(order.CustomerID() !== 0, "order should have a non-zero CustomerID after order deleted");
                ok(order.EmployeeID() !== 0, "order should have a non-zero EmployeeID after order deleted");

                // Breeze should have set OrderID of all former details to zero
                var allOrderIdAreZero = true;
                details.forEach(function (d) {
                    allOrderIdAreZero = allOrderIdAreZero && d.OrderID() === 0;
                });
                ok(allOrderIdAreZero, "OrderID of every original detail should be zero");
            }
        }
    });
    
    /************************** TEST HELPERS *************************/
    function entitySaveTester(masterEntity, shouldSave) {
        var typeName = masterEntity.entityType.shortName;
        var operation = masterEntity.entityAspect.entityState.name;
        var msgPart = " save the " + operation + " " + typeName;

        var manager = masterEntity.entityAspect.entityManager;
        manager.saveChanges()
        .then(function (saveResults) {
            var prefix = shouldSave ? "should" : "should not";
            ok(shouldSave, prefix + " have been able to" + msgPart +
                " with key: " + JSON.stringify(masterEntity.entityAspect.getKey().values));
        })
        .fail(function (error) {
            var prefix = shouldSave ? "should not" : "should";
            ok(!shouldSave, "server " + prefix + " have rejected " + msgPart +
                " with the error: " + error.message);
        }).fin(start);
    }
})(docCode.testFns);