/**************************************************************
 * Tests related to the mapping a JSON response into Breeze
 * with a JsonResultsAdapter 
 *************************************************************/
// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
// ReSharper disable AssignedValueIsNeverUsed
(function (testFns, TestAjaxAdapter) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var extend = breeze.core.extend;
    var EntityQuery = breeze.EntityQuery;

    var handleFail = testFns.handleFail;
    var reportRejectedPromises = testFns.reportRejectedPromises;

    var testAjaxAdapter = new TestAjaxAdapter([]);

    var testDataService = new breeze.DataService({
        serviceName: "api",
        hasServerMetadata: false
    });
    function newTestEm() {
        return new breeze.EntityManager({ dataService: testDataService });
    }
 
    /************************** QUERIES *************************/

    module("jsonResultsAdapterTests", {
        setup: function () { testAjaxAdapter.enable(); },
        teardown: function () { testAjaxAdapter.disable(); }
    });
    
    //#region Todo Zumo payloads  

    /*********************************************************
    * can query an arbitrary object from a vanilla Web API controller
    *********************************************************/
    asyncTest("can map anonymous Zumo Todos" , 1, function () {
        newTestEm().executeQuery("Todos")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var todos = data.results, len = todos.length;
            ok(len, "Expected 'Foos' and got " + len);
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

})(docCode.testFns, docCode.TestAjaxAdapter);