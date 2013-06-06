(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    

    var Enum = core.Enum;

    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityKey = breeze.EntityKey;
    var EntityState = breeze.EntityState;
    
    
    var newEm = testFns.newEm;
    

    module("mongo specific", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });
    
    if (!testFns.DEBUG_MONGO) {
        test("Skipping Mongo specific tests", function () {
            ok(true, "Skipped tests - mongo specfic");
        });
        return;
    };

    test("get embedded orderDetails", function () {
        var em = newEm();
        var q = EntityQuery.from("Orders").where("shipCity", "==", "Stuttgart");
        stop();
        em.executeQuery(q).then(function(data) {
            var orders = data.results;
            var order = orders[0];
            var ods = order.getProperty("orderDetails");
            ok(ods.length > 0, "should be some orderDetails");

        }).fail(testFns.handleFail).fin(start);
    });

    test("add and save embedded orderDetails", function () {
        var em = newEm();
        var q = EntityQuery.from("Orders").where("shipCity", "==", "Stuttgart");
        var orderType = em.metadataStore.getEntityType("Order");
        var odType = em.metadataStore.getEntityType("OrderDetail");
        var odProperty = orderType.getProperty("orderDetails");
        stop();
        var origLength, order, ods;
        em.executeQuery(q).then(function(data) {
            var orders = data.results;
            order = orders[0];
            ods = order.getProperty("orderDetails");
            ok(ods.length > 0, "should be some orderDetails");
            var origLength = ods.length;
            var newOd = odType.createInstance();
            ods.push(newOd);
            ok(ods.length === origLength+1, "length should have grown by 1");
            ok(newOd.complexAspect.parent === order, "parent should be order");
            ok(newOd.complexAspect.parentProperty === odProperty, "parent prop should be orderDetails");
            ok(newOd.complexAspect.propertyPath === "orderDetails", "parent prop should be orderDetails");
            return em.saveChanges();
        }).then(function(sr){
            var ents = sr.entities;
            ok(ents.length === 1, "should have saved 1 entity");
            var newQ = EntityQuery.fromEntities(ents);
            var em2 = newEm();
            return newQ.using(em2).execute();
        }).then(function(data2){
            var sameOrder = data2.results[0];
            var sameOds = sameOrder.getProperty("orderDetails");
            ok(sameOds.length === ods.length);
        }).fail(testFns.handleFail).fin(start);
    });
    
})(breezeTestFns);