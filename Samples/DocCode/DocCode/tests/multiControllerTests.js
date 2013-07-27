/**************************************************************
 * Tests of the Web API controller-per-type scenarios
 * in which there are multiple controllers, one for each entity type
 *************************************************************/
(function (testFns, AjaxAdapterRestyInterceptor) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var EntityQuery = breeze.EntityQuery;   
    var handleFail = testFns.handleFail;
    var alfredsID = testFns.wellKnownData.alfredsID; // The quid ID for the 'Alfreds' customer
    
    var ajaxInterceptor = new AjaxAdapterRestyInterceptor();
    var serviceName = 'multi';
    var masterEm = new breeze.EntityManager(serviceName);
    var masterMetadata = masterEm.metadataStore;

    var newEm = function() { return masterEm.createEmptyCopy(); };
    
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
    * all customers
    *********************************************************/
    asyncTest("all customers", 1, function () {
        var query = EntityQuery.from("Customers");

        newEm().executeQuery(query)
          .then(assertGotCustomers) // success callback
          .fail(handleFail)         // failure callback
          .fin(start);              // "fin" always called.
    });
    
    /*********************************************************
    * 'a' customers
    *********************************************************/
    asyncTest("all 'a' customers", 1, function () {
        var query = EntityQuery
            .from("Customers").where('CompanyName', 'startsWith', 'a');

        newEm().executeQuery(query)
          .then(assertGotCustomers) 
          .fail(handleFail).fin(start);              
    });
    
    /*********************************************************
    * 'Alfreds' customer found by CustomerID
    *********************************************************/
    asyncTest("'Alfreds' customer found by CustomerID", 3, function () {
        var query = EntityQuery
            .from("Customers").where('CustomerID', '==', alfredsID);

        newEm().executeQuery(query)
          .then(assertGotCustomers)
          .then(assertTransformedUrl)
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
                //.then(function() {
                //     log('got metadata during prep');
                //})
                .fin(start); // resume testrunner  
        }
    }

    function assertGotCustomers(data) {
        var count = data.results.length;
        ok(count > 0, "customer query returned " + count);
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
    
})(docCode.testFns, docCode.AjaxAdapterRestyInterceptor);