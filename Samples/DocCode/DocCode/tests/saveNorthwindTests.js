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

    asyncTest("can save a new Northwind Order & InternationalOrder [1..(0,1) relationship]", 2, function () {
        // Create and initialize entity to save
        var em = newNorthwindEm();

        var order = em.createEntity('Order', {
            CustomerID: testFns.wellKnownData.alfredsID,
            EmployeeID: testFns.wellKnownData.nancyID,
            ShipName: "Test " + new Date().toISOString()
        });

        var internationalOrder = em.createEntity('InternationalOrder', {
            // I thought Jay fixed this?
            Order: order, // sets OrderID and pulls it into the order's manager
            //OrderID: order.OrderID(),
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