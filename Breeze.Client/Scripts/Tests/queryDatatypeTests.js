require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var entityModel = breeze.entityModel;
    var EntityQuery = entityModel.EntityQuery;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityKey = entityModel.EntityKey;
    var FilterQueryOp = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;
    var QueryOptions = entityModel.QueryOptions;
    var FetchStrategy = entityModel.FetchStrategy;
    var MergeStrategy = entityModel.MergeStrategy;

    var newEm = testFns.newEm;

    module("queryDatatype", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });
    
    asyncTest("nullable int", function () {
        var em = newEm();
        var query = new EntityQuery("Customers")
            .where("rowVersion", "==", 1);

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
            start();
         }).fail(testFns.handleFail);
    });
    
    asyncTest("nullable int == null", function () {
        var em = newEm();
        var query = new EntityQuery("Customers")
            .where("rowVersion", "==", null);

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
            start();
         }).fail(testFns.handleFail);
    });
    
    asyncTest("nullable date", function () {
        var em = newEm();
        var query = new EntityQuery("Orders")
            .where("orderDate", ">", new Date(1998, 1, 1))
            .take(10);

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0);
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("nullable date == null", function () {
        var em = newEm();
        var query = new EntityQuery("Orders")
            .where("orderDate", "==", null);

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0 );
            start();
         }).fail(testFns.handleFail);
    });
    
    // we don't have a nullable book in NorthwindIB
    asyncTest("bool", function () {
        var em = newEm();
        var query = new EntityQuery("Products")
            .where("isDiscontinued", "==", true );

        em.executeQuery(query).then(function (data) {
            var products = data.results;
            ok(products.length > 0);
            ok(products.every(function(p) {
                return p.getProperty("isDiscontinued") === true;
            }));
            start();
         }).fail(testFns.handleFail);
    });
    
    asyncTest("nonnullable bool == null", function () {
        var em = newEm();
        var query = new EntityQuery("Products")
            .where("discontinued", "==", null );

        em.executeQuery(query).then(function(data) {
            ok(false);
            start();
        }).fail(function(error) {
            // TODO: let see if we can't improve this error message.
            var x = error;
            ok(true, "should get here");
            start();
        });
    });

    asyncTest("nullable guid", function () {
        // ID of the Northwind "Alfreds Futterkiste" customer
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var em = newEm();
        var query = new EntityQuery("Orders")
                .where("customerID", "==", alfredsID);

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
            start();
         }).fail(testFns.handleFail);
    });

    asyncTest("nullable guid == null", function () {
        var em = newEm();
        var query = new EntityQuery("Orders")
            .where("customerID", "==", null);
        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
            start();
         }).fail(testFns.handleFail);
    });

    asyncTest("string equals null", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("region", FilterQueryOp.Equals, null)
            .take(20);

        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 0);
            customers.forEach(function (customer) {
                var region = customer.getProperty("region");
                ok(region == null, "region should be either null or undefined");
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    asyncTest("string not equals null", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("region", FilterQueryOp.NotEquals, null)
            .take(10);

        var queryUrl = query._toUri(em.metadataStore);

        em.executeQuery(query, function (data) {
            var customers = data.results;
            ok(customers.length > 0);
            customers.forEach(function (customer) {
                var region = customer.getProperty("region");
                ok(region != null, "region should not be either null or undefined");
            });
            start();
        }).fail(testFns.handleFail);
    });

    return testFns;

});

