require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var MetadataStore = breeze.MetadataStore;

    var Enum = core.Enum;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityType = breeze.EntityType;

    var newEm = testFns.newEm;

    module("raw odata query", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });


    test("filter and order by", function () {
        stop();
        var em = newEm(testFns.newMs());
        ok(em, "no em found");

        var query = "Customers?$filter=startswith(CompanyName, 'A') eq true&$orderby=CompanyName desc&$expand=Orders";
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var customers = data.results;
            customers.forEach(function (c) {
                ok(c.getProperty("companyName"), "missing companyName property");
                var key = c.entityAspect.getKey();
                ok(key, "missing key");
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("select", function () {
        var em = newEm(testFns.newMs());
        ok(em, "no em found");

        var query = "Customers?$filter=startswith(CompanyName, 'A') eq true&$select=CompanyName, Orders";
        if (!testFns.DEBUG_WEBAPI) {
            query = query + "&$expand=Orders";
        }
        stop();
        em.executeQuery(query).then(function (data) {
            ok(!em.metadataStore.isEmpty(), "metadata should not be empty");
            var orderType = em.metadataStore.getEntityType("Order");
            ok(data, "no data");
            ok(data.results.length > 0, "empty data");
            var anons = data.results;
            anons.forEach(function (a) {
                ok(a.companyName);
                ok(Array.isArray(a.orders));
                a.orders.forEach(function (order) {
                    ok(order.entityType === orderType);
                });
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("bad expr", function () {
        stop();

        var em = newEm();
        var query = "Customers?$filter=starxtswith(CompanyName, 'A') eq true&$orderby=CompanyName desc";

        em.executeQuery(query).fail(function (error) {
            ok(error instanceof Error, "should be an error");
            ok(error.message.indexOf("starxtswith") > -1, "error message has wrong text");
            start();
        }).fail(testFns.handleFail);
    });

    test("raw ajax to web api - server side include many - customer and orders", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "NA for OData impl");
            return;
        }
        stop();
        try {
            $.getJSON(testFns.defaultServiceName+"/CustomersAndOrders?&$top=3").success(function(data, status) {
                ok(data);
                var str = JSON.stringify(data, undefined, 4);
                testFns.output("Customers with orders");
                testFns.output(str);
                start();
            }).error(function(e) {
                testFns.handleFail(e);
            });
        } catch (e) {
            testFns.handleFail(e);
        }
    });

    test("raw ajax to web api - server side include 1 - order and customer", function () {
        if (!testFns.DEBUG_WEBAPI) {
            ok(true, "NA for OData impl");
            return;
        }
        stop();
        try {
            $.getJSON(testFns.defaultServiceName+"/Orders?$top=10&filter=here").success(function (data, status) {
                ok(data);
                var str = JSON.stringify(data, undefined, 4);

                testFns.output("Orders with customers");
                testFns.output(str);
                start();
            }).error(function(e) {
                testFns.handleFail(e);
            });
        } catch (e) {
            testFns.handleFail(e);
        }
    });
    
   

    return testFns;
});