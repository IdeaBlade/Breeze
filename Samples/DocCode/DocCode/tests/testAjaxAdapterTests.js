/**************************************************************
 * Tests of the 'TestAjaxAdapter' class which is used in DocCode
 * to mock JSON results for Breeze integration testing
 *
 * Such mocking is useful 
 * (1) while exploring payloads from services that may be difficult 
 * or impossible to reach during testing (e.g., Zumo) or to simulate
 * service behavior (e.g., server errors) that are difficult to create
 * with a real server.
 * 
 * (2) testing Breeze interaction wtih custom jsonResultsAdapters
 * as it is easier to mock difficult cases than write a service to
 * produce them.
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
    var EntityQuery = new breeze.EntityQuery;
    
    var handleFail = testFns.handleFail;

    var testAjaxAdapter = new TestAjaxAdapter();

    var testDataService = new breeze.DataService({
        serviceName: "test",
        hasServerMetadata: false
    });
    
    function newTestEm() {
        return new breeze.EntityManager({ dataService: testDataService });
    }
    
    var northwindService = testFns.northwindServiceName;
    var newNorthwindEm = testFns.newEmFactory(northwindService);
    /************************** UNIT TESTS *************************/
    
    module("TestAjaxAdapter unit tests", {
        setup: function () {
            // unit tests should never attempt to reach the server
            // the blockServerRequests switch ensures that the TestAjaxAdapter
            // doesn't accidentally go to the server during these module tests
            testAjaxAdapter.blockServerRequests = true;
        },
        teardown: function () {
            testAjaxAdapter.blockServerRequests = false; // restore default
            testAjaxAdapter.disable();
        }
    });

    // the config.blockServerRequests switch ensures that 
    // this particular request cannot accidentally go to the server
    // even if the test adapter would allow it otherwise.
    test("server requests are blocked for THIS module's tests by default.", 1, function () {
        testAjaxAdapter.enable();
        
        var ajaxConfig = makeAjaxConfig({ success: success, error: error });

        testAjaxAdapter.ajax(ajaxConfig);

        function success(data, textStatus, xhr) {
            ok(false, "request should have been blocked and failed");
        }
        function error(xhr, textStatus, errorThrown) {
            ok(/server requests are blocked/i.test(xhr.responseText),
                serverRequestBlockMessage(xhr));
        }
    });
    
    // the config.blockServerRequests switch ensures that 
    // this particular request cannot accidentally go to the server
    // even if the test adapter would allow it otherwise.
    test("can block trip to server at request level.", 1, function () {
        
        // re-enable server requests for the adapter
        testAjaxAdapter.blockServerRequests = false;
        
        // but block them for this request
        testAjaxAdapter.enable({ blockServerRequests: true });

        var ajaxConfig = makeAjaxConfig({ success: success, error: error });

        testAjaxAdapter.ajax(ajaxConfig);

        function success(data, textStatus, xhr) {
            ok(false, "request should have been blocked and failed");
        }
        function error(xhr, textStatus, errorThrown) {
            ok(/server requests are blocked/i.test(xhr.responseText),
                serverRequestBlockMessage(xhr));
        }
    });

    test("can use JSON array quick syntax to fake an OK data response.", 1, function () {
        var expectedData = [{ id: 1, name: 'Bob', userId: null }];
               
        testAjaxAdapter.enable(expectedData); // the quick syntax: just a JSON array
 
        var ajaxConfig = makeAjaxConfig({ success: success });

        testAjaxAdapter.ajax(ajaxConfig);

        function success(data, textStatus, xhr) {
            deepEqual(data, expectedData,
                "request should have returned expected data: " +
                    JSON.stringify(expectedData));
        }
    });
    
    test("can define a default response for all requests ('OK' example).", 1, function () {
        var expectedData = [{ id: 2, name: 'Sally', userId: 42 }];
        
        var adapterConfig = { defaultResponse: { data: expectedData } };
        testAjaxAdapter.enable(adapterConfig);

        var ajaxConfig = makeAjaxConfig({ success: success });

        testAjaxAdapter.ajax(ajaxConfig);

        function success(data, textStatus, xhr) {
            deepEqual(data, expectedData,
                "request should have returned expected data: " +
                    JSON.stringify(expectedData));
        }
    });
    
    test("can specify fake data response for targeted url.", 1, function () {
        
        var testUrl = 'http://host.com/api/test';
        var expectedData = [{ id: 1, name: 'Bob', userId: null }];
        var response = { url: "api/test", data: expectedData };
        
        // register a response for a specific url
        testAjaxAdapter.enable({responses:[response], blockServerRequests: true});

        var ajaxConfig = makeAjaxConfig({url: testUrl, success: success });

        testAjaxAdapter.ajax(ajaxConfig);

        function success(data, textStatus, xhr) {
            deepEqual(data, expectedData,
                "request should have returned expected data.");
        }
    });

    /************************** QUERIES *************************/

    module("TestAjaxAdapter query tests", {
        setup: function() {
            testFns.populateMetadataStore(newNorthwindEm);
        },
        teardown: function () { testAjaxAdapter.disable(); }
    });
    
    asyncTest("can handle anonymous Zumo Todos when all properties are defined.", 1, function () {
        
        testAjaxAdapter.enable([{ id: 1, title: "Learn Breeze"}]);
        
        newTestEm().executeQuery("Todos")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var todos = data.results, len = todos.length;
            ok(len, "Expected 'Foos' and got " + len);
        }
    });
    
    asyncTest("can handle anonymous Zumo Todos when a property is null.", 1, function () {

        testAjaxAdapter.enable([{ id: 1, title: "Learn Breeze", userId: null }]);

        newTestEm().executeQuery("Todos")
            .then(success).fail(handleFail).fin(start);

        function success(data) {
            var todos = data.results, len = todos.length;
            ok(len, "Expected 'Foos' and got " + len);
        }
    });
    
    test("can mix sync tests with async TestAjaxAdapter tests", 1,
     function () { ok(true, "should always be ok"); });
    
    asyncTest("can project all Northwind customers (with server trip).", function () {

        // Notice that an enabled testAJaxAdapter is OK when no response matches
        testAjaxAdapter.enable({
            responses: {
                url: 'xxx', // pattern doesn't match anything in the request URL
                data: []
            }
        });
        northwindCustomerTwoPropTest();

    });
    
    asyncTest("can test Northwind customer projection with data snapshot (no server trip).", function () {

        // Now we fake the data from a snapshot of the full projection
        testAjaxAdapter.enable({
            responses: {
                url: 'Customers', // this pattern is found in the request URL
                data: [
                    {
                        $id: "1",
                        $type: "_IB_b_df7gzYPPl_dNuhWbK5AwbFhte14[[System.Guid, mscorlib],[System.String, mscorlib]], _IB_b_df7gzYPPl_dNuhWbK5AwbFhte14_IdeaBlade",
                        CustomerID: "729de505-ea6d-4cdf-89f6-0360ad37bde7",
                        CompanyName: "Die Wandernde Kuh"
                    },
                    {
                        $id: "2",
                        $type: "_IB_b_df7gzYPPl_dNuhWbK5AwbFhte14[[System.Guid, mscorlib],[System.String, mscorlib]], _IB_b_df7gzYPPl_dNuhWbK5AwbFhte14_IdeaBlade",
                        CustomerID: "cd98057f-b5c2-49f4-a235-05d155e636df",
                        CompanyName: "Suprêmes délices"
                    } ]
            }
        });
        
        northwindCustomerTwoPropTest();

    });

    asyncTest("can test Northwind customer projection with faked data (no server trip).", function () {

        // Now we fake just fake the data
        // Use the quick syntax which specifies the successful data result for ALL requests
        // because this test only makes one request.
        testAjaxAdapter.enable([
                    { CustomerID: "Not-a-Guid",
                      CompanyName: "Acme" },
                    { CustomerID: "Nor-is-this",
                      CompanyName: "Beta"}]);

        northwindCustomerTwoPropTest();

    });

    function northwindCustomerTwoPropTest() {
        expect(2);
        EntityQuery.from('Customers')
           .select('CustomerID, CompanyName')
           .using(newNorthwindEm()).execute()
           .then(success).fail(handleFail).fin(start);

        function success(data) {
            var projections = data.results, len = projections.length;
            ok(len, "expected some projected Customers and got " + len);
            if (len > 0) {
                var first = projections[0];
                var props = [], values = [];
                for (var prop in first) {
                    props.push(prop);
                    values.push(prop + ": '"+first[prop]+"'");
                }
                equal(props.length, 2,
                    "a projected customer should have 2 properties; the first customer is " + values.join(", "));             
            }
        }
    }

    asyncTest("can fake query result for all Northwind customers with snapshot (no server trip).", 3, function () {

        // Now we fake the data from a snapshot of the full projection
        testAjaxAdapter.enable({
            responses: {
                url: 'Customers',
                data: customerSnapshot
            }
        });

        EntityQuery.from('Customers')
         .select('CustomerID, CompanyName')
         .using(newNorthwindEm()).execute()
         .then(success).fail(handleFail).fin(start);
        
        function success(data) {
            var customers = data.results, len = customers.length;
            ok(len, "expected some complete Customers and got " + len);
            if (len > 0) {
                var first = customers[0];
                ok(first.entityAspect, "a complete customer should be an entity (has an entityAspect)");
                var props = [];
                for (var prop in first) {
                    if (first.hasOwnProperty(prop) && prop !== 'entityAspect') { props.push(prop); }
                }
                // all data properties (data and nav)
                var expectedCount = first.entityType.getProperties().length;
                equal(props.length, expectedCount, 
                    "a complete customer should have " + expectedCount + 
                    " properties; the first customer has " + props.join(", "));
            }
        }

    });

    var customerSnapshot = [
        {
            $id: "1",
            $type: "Northwind.Models.Customer, DocCode.Models",
            CustomerID: "729de505-ea6d-4cdf-89f6-0360ad37bde7",
            CompanyName: "Die Wandernde Kuh",
            ContactName: "Rita Müller",
            ContactTitle: "Sales Representative",
            Address: "Adenauerallee 900",
            City: "Stuttgart",
            PostalCode: "70563",
            Country: "Germany",
            Phone: "0711-020361",
            Fax: "0711-035428"
        },
        {
            $id: "2",
            $type: "Northwind.Models.Customer, DocCode.Models",
            CustomerID: "cd98057f-b5c2-49f4-a235-05d155e636df",
            CompanyName: "Suprêmes délices",
            ContactName: "Pascale Cartrain",
            ContactTitle: "Accounting Manager",
            Address: "Boulevard Tirou, 255",
            City: "Charleroi",
            PostalCode: "B-6000",
            Country: "Belgium",
            Phone: "(071) 23 67 22 20",
            Fax: "(071) 23 67 22 21"
        }];
 
    asyncTest("can block trip to server.", 1, function () {

        testAjaxAdapter.enable({ blockServerRequests: true });

        newTestEm().executeQuery("Todos")
            .then(success).fail(expectedFail).fin(start);

        function success(data) {
            ok(false, "query should have been blocked and failed");
        }

        function expectedFail(error) {
            ok(/server requests are blocked/i.test(error.responseText),
                serverRequestBlockMessage(error.XHR));
        }
    });
    
    /************************** TEST HELPERS *************************/
    function makeAjaxConfig(config) {
        return extend({
                url: 'http://host.com/api/test',
                dataType: 'json',
                method: 'GET',
                error: unexpectedAjaxAdapterError
            }, config || {} );
    };
    
    function unexpectedAjaxAdapterError(xhr, textStatus, errorThrown) {
        ok(false,
            "ajax adapter returned unexpected error, {0}-{1}: '{2}'".format(
            xhr.status, xhr.statusText, errorThrown.message));
    }

    function serverRequestBlockMessage(xhr) {
        return "blocked trip to server ({0}); error was {1}-{2}: '{3}'".format(
            (xhr.__ajaxConfig && xhr.__ajaxConfig.url) || 'unknown url',
            xhr.status, xhr.statusText, xhr.responseText);
    }
    
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