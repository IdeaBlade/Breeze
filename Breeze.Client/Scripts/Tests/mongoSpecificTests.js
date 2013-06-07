(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    

    var Enum = core.Enum;

    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityKey = breeze.EntityKey;
    var EntityState = breeze.EntityState;
    var FilterQueryOp = breeze.FilterQueryOp;
    
    
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
        stop();
        var order, ods;
        insertOneOrderDetail(em).then(function(sr) {
            order = sr.entities[0];
            ods = order.getProperty("orderDetails");
            var newQ = EntityQuery.fromEntities(order);
            var em2 = newEm();
            return newQ.using(em2).execute();
        }).then(function(data2){
            var sameOrder = data2.results[0];
            var sameOds = sameOrder.getProperty("orderDetails");
            ok(sameOds.length === ods.length);
            var isOk = sameOds.some(function(od) {
                return od.getProperty("unitPrice") === 999 && od.getProperty("quantity") === 999;
            })
            ok(isOk, "should have found inserted orderDetail")
        }).fail(testFns.handleFail).fin(start);
    });

    test("remove and save embedded orderDetails", function () {
        var em = newEm();
        var order, ods, odsLength;
        stop();
        insertOneOrderDetail(em).then(function(sr) {
            order = sr.entities[0];
            ods = order.getProperty("orderDetails");
            odsLength = ods.length;
            breeze.core.arrayRemoveItem(ods, function(od) {
                return od.getProperty("unitPrice") === 999;
            })
            return em.saveChanges();
        }).then(function() {
            var newQ = EntityQuery.fromEntities(order);
            var em2 = newEm();
            return newQ.using(em2).execute();
        }).then(function(data2){
            var sameOrder = data2.results[0];
            ods = order.getProperty("orderDetails");
            ok(odsLength === ods.length + 1, "one orderDetail should have been removed");
        }).fail(testFns.handleFail).fin(start);
    });

    test("cleanup  test data", function() {

        var em = newEm();
        var p = breeze.Predicate.create("companyName", FilterQueryOp.StartsWith, "Test")
            .or("companyName", FilterQueryOp.StartsWith, "foo");
        var q = EntityQuery.from("Customers").where(p);
        stop();
        var custs;
        em.executeQuery(q).then(function(data) {
            custs = data.results;
            var orderPromises = custs.map(function(cust) {
                return cust.getProperty("orders").load();
            });
            return Q.all(orderPromises);
        }).then(function() {
            custs.forEach(function(cust) {
                cust.entityAspect.setDeleted();
                cust.getProperty("orders").forEach(function(o) {
                    o.entityAspect.setDeleted();
                });
            });
            return em.saveChanges();
        }).then(function(sr) {
            ok(sr, "test cust/order deletes should have completed - deleted: " + sr.entities.length);
            var qNullOrders = EntityQuery.from("Orders").where("shipCity", "==", null);
            return em.executeQuery(qNullOrders);
        }).then(function(dataOrders) {
            var orders = dataOrders.results;
            orders.forEach(function(o) {
                o.entityAspect.setDeleted();
            });
            return em.saveChanges();
        }).then(function(sr) {
            ok(sr, "null orders deletes should have completed - deleted: "+ sr.entities.length);
        }).fail(testFns.handleFail).fin(start);
    });


    test("cleanup embedded orderDetails", function () {
        var em = newEm();
        stop();
        var orderType = em.metadataStore.getEntityType("Order");
        var odType = em.metadataStore.getEntityType("OrderDetail");
        var odProperty = orderType.getProperty("orderDetails");
        var origLength, order, ods;
        insertOneOrderDetail(em).then(function(sr) {
            return queryTestOrders(em);
        }).then(function(data) {
            var orders = data.results;
            orders.forEach(function(order) {
                ods = order.getProperty("orderDetails");
                breeze.core.arrayRemoveItem(ods, function(od){
                    return od.getProperty("productID") === 0;
                }, true)
            });
            return em.saveChanges();
        }).then(function(sr){
            var ents = sr.entities;
            ok(ents.length > 0, "should have updated at least 1 entity: " + ents.length);
            var newQ = EntityQuery.fromEntities(ents);
            var em2 = newEm();
            return newQ.using(em2).execute();
        }).then(function(data2){
            var orders = data2.results;
            orders.forEach(function(order) {
                var sameOds = order.getProperty("orderDetails");
                var isOk = sameOds.every(function(od) {
                    return od.getProperty("unitPrice") !== 999 || od.getProperty("quantity") !== 999;
                })
                ok(isOk, "should have cleared up all temp orderDetails");
            });
        }).fail(testFns.handleFail).fin(start);
    });

    function insertOneOrderDetail(em) {

        var orderType = em.metadataStore.getEntityType("Order");
        var odType = em.metadataStore.getEntityType("OrderDetail");
        var odProperty = orderType.getProperty("orderDetails");
        var origLength, order, ods;
        return queryTestOrders(em).then(function(data) {
            var orders = data.results;
            order = orders[0];
            ods = order.getProperty("orderDetails");
            ok(ods.length > 0, "should be some orderDetails");
            var origLength = ods.length;
            var newOd = odType.createInstance();
            newOd.setProperty("unitPrice", 999 );
            newOd.setProperty("quantity", 999);
            ods.push(newOd);
            ok(ods.length === origLength+1, "length should have grown by 1");
            ok(newOd.complexAspect.parent === order, "parent should be order");
            ok(newOd.complexAspect.parentProperty === odProperty, "parent prop should be orderDetails");
            ok(newOd.complexAspect.propertyPath === "orderDetails", "parent prop should be orderDetails");
            return em.saveChanges();
        }).then(function(sr) {
           var ents = sr.entities;
           ok(ents.length === 1, "should have saved 1 entity");
           return Q.resolve(sr);
        });

    }

    function queryTestOrders(em) {
        var q = EntityQuery.from("Orders").where("shipCity", "==", "Stuttgart");

        return em.executeQuery(q);
    }

    
})(breezeTestFns);