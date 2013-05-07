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
   
    // This CustomerID guid is known to be new in the Northwind db
    var newCustomerID = "7bf56882-d975-4faf-a794-dda9be357390";
    var alfredsID = testFns.wellKnownData.alfredsID;

    module("saveNorthwindTests", {
        setup: function () {
            testFns.populateMetadataStore(newNorthwindEm);
        },
        teardown: function () {
            testFns.northwindReset(); // restore original db state after each test
        }
    });

    asyncTest("can save a new Customer entity", 1, function () {

        // Create and initialize entity to save
        var em = newNorthwindEm();
        var entity = em.createEntity('Customer',
            {
                CustomerID: newCustomerID
            }
        );
        entity.CompanyName("Test " + new Date().toISOString());

        // Act and Assert
        entitySaveTester(entity, /*shouldSave*/ true);

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
    function entitySaveTester(entity, shouldSave) {
        var typeName = entity.entityType.shortName;
        var operation = entity.entityAspect.entityState.name;
        var msgPart = " save the " + operation + " " + typeName;

        var manager = entity.entityAspect.entityManager;
        manager.saveChanges([entity])
        .then(function (saveResults) {
            var prefix = shouldSave ? "should" : "should not";
            ok(shouldSave, prefix + " have been able to" + msgPart +
                " with key: " + JSON.stringify(entity.entityAspect.getKey().values));
        })
        .fail(function (error) {
            var prefix = shouldSave ? "should not" : "should";
            ok(!shouldSave, "server " + prefix + " have rejected " + msgPart +
                " with the error: " + error.message);
        }).fin(start);
    }
})(docCode.testFns);