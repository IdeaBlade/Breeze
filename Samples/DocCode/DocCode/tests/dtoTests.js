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
    var handleSaveFailed = testFns.handleSaveFailed;
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
    var newNorthwindEm = testFns.newEmFactory(northwindService);

    var moduleOptions = testFns.getModuleOptions(newNorthwindEm);

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
    
    /*********************************************************
    * can get Foos metadata from a dedicated metadata controller
    *********************************************************/
    asyncTest("can get Foos metadata from a dedicated metadata controller", 1, function () {
        var store = new breeze.MetadataStore();
        store.fetchMetadata("breeze/FoosMetadata")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var fooType = store.getEntityType('Foo');
            ok(fooType, "Got metadata; has 'Foo' entity type with data properties: "+
            fooType.dataProperties.map(function (p) { return "'" + p.name + "'"; }).join(", "));
        }
    });
    //#endregion

    /*********************************************************
    * can fetch a hash of entities (Lookups)
    *********************************************************/
    asyncTest("can fetch a hash of entities", 6, function () {
        newNorthwindEm().executeQuery("Lookups")
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
    

    /************************** SAVES *************************/
    // This CustomerID guid is known to be new in the Northwind db
    var newCustomerID = testFns.newGuidComb();
    var alfredsID = testFns.wellKnownData.alfredsID;
    
    module("dtoTests - saves", {
        setup: function () {
            testFns.populateMetadataStore(newNorthwindEm);
        },
        teardown: function() {
            testFns.teardown_northwindReset();
        }
    });

    asyncTest("can save a new Customer entity with hidden CustomerID_OLD", 1, function () {

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