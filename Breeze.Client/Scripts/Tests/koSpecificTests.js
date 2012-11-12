require.config({ baseUrl: "Scripts/IBlade" });
define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;

    var Enum = core.Enum;

    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityQuery = entityModel.EntityQuery;
    var EntityKey = entityModel.EntityKey;
    var EntityState = entityModel.EntityState;


    var newEm = testFns.newEm;

    module("ko specific", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });
    
    if (testFns.modelLibrary !== "ko") {
        test("Skipping KO specific tests", function () {
            ok(false, "Skipped tests - ok to fail");
        });
        return testFns;
    };
    
    test("disallow setting collection navigation properties", function () {
        // ko specific
        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        var orderType = em.metadataStore.getEntityType("Order");
        var order = orderType.createEntity();
        em.attachEntity(customer);
        var origOrders = customer.getProperty("orders");
        ok(origOrders.length === 0);

        customer.orders.push(order);
        ok(origOrders.length === 1);
        try {
            customer.setProperty("orders", ["foo", "bar"]);
            ok(false, "should not get here");
        } catch (e) {
            ok(e.message.indexOf("navigation") >= 0, "Exception should relate to navigation:" + e);
            ok(customer.getProperty("orders") == origOrders);
        }
    });
    
    test("query results notification", function () {
        var em = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID)
            .using(em);
        stop();
        var arrayChangedCount = 0;
        var koArrayChangedCount = 0;
        var adds;
        var koAdds;
        query.execute().then(function (data) {
            var customer = data.results[0];
            customer.orders.subscribe(function(val) {
                koArrayChangedCount++;
                koAdds = val;
            });
            customer.orders().arrayChanged.subscribe(function (args) {
                arrayChangedCount++;
                adds = args.added;
            });
            return query.expand("orders").execute();
        }).then(function (data2) {
            ok(arrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(koArrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(adds && adds.length > 0, "should have been multiple entities shown as added");
            deepEqual(adds, koAdds, "adds and koAdds should be the same");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("chaining on write", function () {
     
        var em1 = newEm();
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        var sameCust = cust1.companyName("First");
        ok(sameCust === cust1, "ko setters need to chain");
        var val1 = cust1.companyName();
        ok(val1 === "First");
        cust1.companyName("Second").contactTitle("Foo").contactName("Bar");
        ok(cust1.contactTitle() == "Foo");
        ok(cust1.contactName() == "Bar");
    });
    
    test("observable array", function () {
        var items = [];
        var oa = ko.observableArray(items);
        var changeCount = 0;
        oa.subscribe(function () {
            changeCount++;
        });
        oa.push("adfadf");
        var em = newEm();

        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID)
            .expand("orders");
        var customer;
        stop();
        query.using(em).execute().then(function (data) {
            customer = data.results[0];
            var orderType = em.metadataStore.getEntityType("Order");
            var order = orderType.createEntity();
            var count = customer.orders().length;
            var ix = 0;
            customer.orders.subscribe(function () {
                ix = ix + 1;
            });
            customer.orders.push(order);
            var count2 = customer.orders().length;
            ok(count2 == count + 1);
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("observable array mutate on change", function () {
        var em = newEm();

        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where("customerID", "==", alfredsID);
        var customer;
        stop();
        var orders;
        var koOrders;
        var arrayChangeCount = 0;
        var koChangeCount = 0;
        query.using(em).execute().then(function (data) {
            customer = data.results[0];
            orders = customer.orders();
            orders.arrayChanged.subscribe(function(changes) {
                arrayChangeCount++;
            });
            koOrders = customer.orders;
            koOrders.subscribe(function(x) {
                koChangeCount++;
            });
            return customer.entityAspect.loadNavigationProperty("orders");
        }).then(function (orders2) {
            var x = orders2;
            ok(arrayChangeCount === koChangeCount);
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("disallow setting collection navigation properties", function () {
        // ko specific
        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        var orderType = em.metadataStore.getEntityType("Order");
        var order = orderType.createEntity();
        em.attachEntity(customer);
        var origOrders = customer.orders();
        ok(origOrders.length === 0);
        customer.orders.push(order);
        ok(origOrders.length === 1);
        try {
            customer.orders(["foo", "bar"]);
            ok(false, "should not get here");
        } catch (e) {
            ok(e.message.indexOf("navigation") >= 0, "Exception should relate to navigation:" + e);
            ok(customer.orders() == origOrders);
        }
    });
    
    return testFns;
});