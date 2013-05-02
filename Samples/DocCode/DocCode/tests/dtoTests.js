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

    asyncTest("can query all of an unknown type (Foo)", 1, function () {

        var em = new breeze.EntityManager({ dataService: rootDataService });
        var queryUrl = "api/foos";
        
        em.executeQuery(queryUrl)
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var foos = data.results;
            var len = foos.length;
            ok(len, "Expected 'Foos' and got " + len);
        }
    });
    
    /*********************************************************
    * can query an arbitrary object from a regular Web API controller
    *********************************************************/

    /************************** TEST HELPERS *************************/

});