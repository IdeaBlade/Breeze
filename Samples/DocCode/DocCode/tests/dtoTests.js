/**************************************************************
 * Tests related to the "DTO" documentation
 * Explore a variety of approaches for fetching and saving data
 * that are not shaped or mapped directly to the server-side entities
 * DTOs are one ... but only one ... of the ways to cope
 *************************************************************/
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
// ReSharper disable AssignedValueIsNeverUsed
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var extend = breeze.core.extend;
    var EntityQuery = breeze.EntityQuery;

    var waitForTestPromises = testFns.waitForTestPromises;
    var handleFail = testFns.handleFail;
    var reportRejectedPromises = testFns.reportRejectedPromises;

    // When targeting the Foo controller 
    var fooDataService = new breeze.DataService({
        serviceName: "api",
        hasServerMetadata: false
    });
    function newFooEm() {
        return new breeze.EntityManager({ dataService: fooDataService });
    }
    
    // Target the Northwind service by default
    var northwindService = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(northwindService);

    var moduleOptions = testFns.getModuleOptions(newEm);

    /************************** QUERIES *************************/

    module("dtoTests", moduleOptions);
    
    //#region Foo queries  

    /*********************************************************
    * can query an arbitrary object from a vanilla Web API controller
    *********************************************************/
    asyncTest("can query all Foos from a vanilla Web API controller", 1, function () {
        newFooEm().executeQuery("foos")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results, len = foos.length;
            ok(len, "Expected 'Foos' and got " + len);
        }
    });
    asyncTest("can filter Foos from a vanilla Web API controller", 2, function () {
        newFooEm().executeQuery("foos/?$filter=ID le 3")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results, len = foos.length;
            ok(len, "Expected 'Foos' and got " + len);
            var foosWithIdOver3 = foos.filter(function(f) { return f.ID > 3; });
            equal(foosWithIdOver3.length, 0, "Should have no 'Foo' with ID>3.");
        }
    });
    asyncTest("can get a Foo by ID from a vanilla Web API controller", 2, function () {
        newFooEm().executeQuery("foos/1")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results, len = foos.length;
            equal(len, 1, "Expected one 'Foo' and got " + len);
            equal(data.results[0].ID, 1, "Should have raw 'Foo' with ID eq 1.");
        }
    });
    //#endregion

    /*********************************************************
    * can fetch a hash of entities (Lookups)
    *********************************************************/
    asyncTest("can fetch a hash of entities", 6, function () {
        newEm().executeQuery("Lookups")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var bag = data.results[0], propNames = [];
            ok(bag, "expected to get an object, 'the hash'.");
            ok(bag.entityAspect == undefined,
                "the hash should not be an entity.");
            for (var prop in bag) {
                propNames.push(prop);
            };
            equal(propNames.length, 3,
                "expected hash to have 3 members and got " + propNames.join(", "));
            propNames.forEach(function (propName) {
                var ex = null;
                try {
                    bag[propName][0].entityAspect.entityState.isUnchanged();
                } catch(ex) {}
                ok(!ex, "expected '" +propName+ "' be an array containing Unchanged entities.");
            });
            
        }
    });
    
    /*********************************************************
    * Northwind save tests: tweek to explore various saves
    * Not part of the official DocCode test suite
    * Useful factoids
    *   breeze.core.getUuid() // method to create Guids
    *   testFns.newGuid() // alternative
    *   "729de505-ea6d-4cdf-89f6-0360ad37bde7" // the first customer in the db
    *********************************************************/
    //asyncTest("can save a Northwind entity", 1, function () {

    //    var typeName = 'Customer';
        
    //    // Create and initialize entity to save
    //    var em = newEm();
    //    var entity = em.createEntity(typeName,
    //        {
    //            CustomerID: "7bf56882-d975-4faf-a794-dda9be357390"                 
    //        }
    //      , breeze.EntityState.Unchanged
    //    );
    //    entity.CompanyName("Test Company 2 - ***");

    //    // Act and Assert
    //    entitySaveTester(entity, /*shouldSave*/ true);

    //});
 
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