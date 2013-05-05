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

    /************************** QUERIES *************************/

    module("TestAjaxAdapter tests", {
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
        testAjaxAdapter.enable({
            responses: {
                url: 'Customers',
                data: [
                    { CustomerID: "Not-a-Guid",
                      CompanyName: "Acme" },
                    { CustomerID: "Nor-is-this",
                      CompanyName: "Beta"}]
            }
        });

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