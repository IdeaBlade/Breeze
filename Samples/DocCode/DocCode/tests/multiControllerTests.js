/**************************************************************
 * Tests of the Web API controller-per-type scenarios
 * in which there are multiple controllers, one for each entity type
 * and a special controller ('MultiController') to handle 
 * metadata and saveChanges requests.
 *
 * The sample Web API controllers are in Controller/MultiControllers
 *
 * Tests ALSO use the AjaxRestInterceptor to convert a 
 * query-by-id, e.g., /multi/employees?$filter=id eq 1
 * into a "resty" query, e.g. /breeze/employees/1
 *
 * Engage the AjaxRestInterceptor as follows:
 *    var ajaxInterceptor = new breeze.AjaxRestInterceptor();
 *    ajaxInterceptor.enable(); // call disable() to restore orig
 *
 * Relies on Web API routing to re-route to controllers.
 * See the "Breeze MultiController routes" region in App_Start.BreezeWebApiConfig
 * which looks for api routes with the "multi" service name.
 * This is standard Web API stuff.
 *
 * Watch the network traffic in the browser tools while running tests
 * to see the URL (especially those re-written by the interceptor).
 *
 *************************************************************/
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var EntityQuery = breeze.EntityQuery;   
    var handleFail = testFns.handleFail;
    var alfredsID = testFns.wellKnownData.alfredsID; // guid ID for the 'Alfreds' customer
    
    var serviceName = 'multi';
    var masterEm = new breeze.EntityManager(serviceName);
    var masterMetadata = masterEm.metadataStore;
    var newEm = function () { return masterEm.createEmptyCopy(); };
    
    var ajaxInterceptor = new breeze.AjaxRestInterceptor();
    
    module("multi-controller tests", {
        setup: function () {
            prepMasterMetadata();
            ajaxInterceptor.enable();
        },
        teardown: function () {
            ajaxInterceptor.disable();
        }
    });
    /*********************************************************
    * all employees
    *********************************************************/
    asyncTest("all employees", 1, function () {
        var query = EntityQuery.from("Customers");

        newEm().executeQuery(query)
          .then(assertGotSomeResults)
          .fail(handleFail).fin(start);
    });
    /*********************************************************
    * Employees with 'n' name
    *********************************************************/
    asyncTest("all employees with 'n' in FirstName", 1, function () {
        var query = EntityQuery.from("Employees")
            .where('FirstName', 'contains', 'n');

        newEm().executeQuery(query)
          .then(assertGotSomeResults)
          .fail(handleFail).fin(start);
    });
    /*********************************************************
    * Employee found by where(EmployeeID eq 1)
    *********************************************************/
    asyncTest("Employee found by where(EmployeeID eq 1)", 4, function () {
        var query = EntityQuery.from("Employees")
            .where('EmployeeID', 'eq', 1);

        newEm().executeQuery(query)
          .then(assertGotSomeResults)
          .then(assertTransformedUrl)
          .then(assertCanUseQueryLocally)
          .fail(handleFail).fin(start);
    });
     
    /*********************************************************
    * Employee found by EmployeeID when appended to resource name
    *********************************************************/
    asyncTest("Employee found by EmployeeID when appended to resource name", 3, function () {
        var query = EntityQuery
            .from("Employees/1"); // by-pass OData query by appending to resource name

        newEm().executeQuery(query)
          .then(assertGotSomeResults)
          .then(assertUrlUnchanged)
          .then(assertCannotUseQueryLocally)
          .fail(handleFail).fin(start);

    });
    /*********************************************************
    * First 10 customers
    *********************************************************/
    asyncTest("First 10 customers", 1, function () {
        var query = EntityQuery.from("Customers")
            .orderBy('CompanyName')
            .top(10);

        newEm().executeQuery(query)
          .then(assertGotSomeResults) 
          .fail(handleFail).fin(start);
    });   
    /*********************************************************
    * 'Alfreds' customer found by CustomerID in where clause
    *********************************************************/
    asyncTest("'Alfreds' customer found by CustomerID in where clause", 4, function () {
        var query = EntityQuery.from("Customers")
            .where('CustomerID', '==', alfredsID);

        newEm().executeQuery(query)
          .then(assertGotSomeResults)
          .then(assertTransformedUrl)
          .then(assertCanUseQueryLocally)
          .fail(handleFail).fin(start);              
    });

    /*********************************************************
    * Helpers
    *********************************************************/
    function prepMasterMetadata() {
        if (!masterMetadata.hasMetadataFor(serviceName)) {
            stop(); // tell testrunner to wait.
            masterMetadata.fetchMetadata(serviceName)
                .fail(handleFail)
                .fin(start); // resume testrunner  
        }
    }

    function assertGotSomeResults(data) {
        var count = data.results.length;
        ok(count > 0, "query of '"+data.query.resourceName+"' returned " + count);
        return data;
    }
    
    function assertTransformedUrl(data) {
        var diagnostics = ajaxInterceptor.diagnostics;
        var url = diagnostics.lastSettings.url;
        var origUrl = diagnostics.lastOrigUrl;
        notEqual(url, origUrl, "url should have changed from " + origUrl);
        // we infer that the URL was transformed because the URL changed and doesn't filter on ID
        var noId = !/\?\$filter=\w*[iI][dD]/.test(url);
        ok(noId, "actual request url = "+url+"; did not filter for ID (infer resty resource)");
        return data;
    }
    
    function assertUrlUnchanged(data) {
        var diagnostics = ajaxInterceptor.diagnostics;
        var url = diagnostics.lastSettings.url;
        var origUrl = diagnostics.lastOrigUrl;
        equal(url, origUrl, "original and actual url are the same: " + origUrl);
        return data;
    }
 
    function assertCanUseQueryLocally(data) {
        var em = data.entityManager;
        var remoteEntity = data.results[0];
        var localEntity = em.executeQueryLocally(data.query)[0];
        ok(localEntity && remoteEntity === localEntity,
        "remote and locally queried entities are the same.");
    }
    
    function assertCannotUseQueryLocally(data) {
        var em = data.entityManager;
        var errmsg = undefined;
        try { em.executeQueryLocally(data.query); }
        catch (err) { errmsg = err.message; }
        var gotExpectedErr = /Cannot find an entityType/i.test(errmsg);
        ok(gotExpectedErr,
            "should throw 'cannot find entity type' exception;  actual error was '" +
            errmsg + "'");
        return data;
    }
    
})(docCode.testFns);