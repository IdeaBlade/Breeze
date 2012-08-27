// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var entityModel = breeze.entityModel;

    var MetadataStore = entityModel.MetadataStore;
    var EntityQuery = entityModel.EntityQuery;
    var qop = entityModel.FilterQueryOp;

    var serviceName = testFns.northwindServiceName,
        metadataStore = new MetadataStore(),
        newEm = testFns.emFactory(serviceName, metadataStore);

    module("simpleQueryTests", testFns.moduleSetupTeardown(newEm, metadataStore));

    asyncTest("get all customers", 2, function () {
        var em = newEm(),
        query = new EntityQuery("Customers");

        em.executeQuery(query)
        .then(function (data) {
            ok(data.results.length > 0, "should have customers.");
            start();
        })
        .fail(testFns.handleFail); 
    });

    asyncTest("customers starting w/ 'C'", 2, function () {

        var em = newEm(),
            query = new EntityQuery()
            .from("Customers")
            .where("CompanyName", qop.StartsWith, "C") // or use "startsWith" 
            .orderBy("CompanyName");

        em.executeQuery(query)
            .then(function (data) {
                ok(data.results.length > 0, "should have customers starting w/ 'C'.");
                start();
            })
            .fail(testFns.handleFail);

    });

    asyncTest("get all employees", 2, function () {
        var em = newEm(),
        query = new EntityQuery("Employees");

        em.executeQuery(query)
            .then(function (data) {
                ok(data.results.length > 0, "should have Employees.");
                start();
            })
            .fail(testFns.handleFail);
    });
    
    return testFns;
});