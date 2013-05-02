/**************************************************************
 * Tests related to the "DTO" documentation
 * Explore a variety of approaches for fetching and saving data
 * that are not shaped or mapped directly to the server-side entities
 *************************************************************/
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
// ReSharper disable AssignedValueIsNeverUsed

define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var extend = breeze.core.extend;
    var EntityQuery = breeze.EntityQuery;

    var waitForTestPromises = testFns.waitForTestPromises;
    var handleFail = testFns.handleFail;
    var reportRejectedPromises = testFns.reportRejectedPromises;

    var rootUri = testFns.rootUri;
    var rootDataService = new breeze.DataService({
        serviceName: rootUri,
        hasServerMetadata: false
    });
    
    // Target the Northwind service
    var northwindService = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(northwindService);

    var moduleOptions = testFns.getModuleOptions(newEm);

    /************************** QUERIES *************************/

    module("dtoTests - queries", moduleOptions);
    
    //#region Foo queries  
    function newFooEm() {
        var ds = rootDataService.using( {serviceName: "api"});
        return new breeze.EntityManager({ dataService: ds });
    }
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
    
    /************************** TEST HELPERS *************************/

});