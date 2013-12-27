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

    test("query with quote", function() {
        var em = newEm();
        var q = EntityQuery.from("Customers").where("companyName", "contains", "'");
        stop();
        var recs;
        em.executeQuery(q).then(function(data) {
            var recs = data.results;
            ok(recs.length >  0, "should have found some recs");
            var recs2 = em.executeQueryLocally(q);
            ok(recs.length === recs2.length, "local query should have returned the same recs");
        }).fail(testFns.handleFail).fin(start);

    });


    test("get/save employee hobbies", function() {
        var em = newEm();
        var q = EntityQuery.from("Employees").take(5);
        stop();
        var emps, emp;
        em.executeQuery(q).then(function(data) {
            emps = data.results;
            emp = emps[0];
            var hobbies = emp.getProperty("hobbies");
            try {
                emp.setProperty("hobbies", ["tennis", "swimming"]);
                ok(false, "should not get here");
            } catch (e) {
                ok(true, "should get here");
            }
            if (hobbies.indexOf("tennis") === -1) {
                hobbies.push("tennis");
                hobbies.push("swimming");
            } else {
                hobbies.splice(0,hobbies.length, "rock climbing", "reading" );
            }
            return em.saveChanges();
        }).then(function(sr) {
            ok(sr.entities.length === 1, "should have saved 1 rec");
            ok(sr.entities[0] === emp);
            var q2 = EntityQuery.fromEntities(emp);
            var em2 = newEm();
            return em2.executeQuery(q2);
        }).then(function(data2){
            var sameEmp = data2.results[0];
            sameHobbies = sameEmp.getProperty("hobbies");
            // sameHobbies will either be of length 2 or 4 now.
            ok(sameHobbies != null && Array.isArray(sameHobbies) && sameHobbies.length >= 2, "should have saved hobbies");

        }).fail(testFns.handleFail).fin(start);

    });

    test("arrayChanged on employee hobbies", function() {
        var em = newEm();
        var q = EntityQuery.from("Employees").take(5);
        stop();
        var emps, emp;
        em.executeQuery(q).then(function(data) {
            emps = data.results;
            emp = emps[0];
            var hobbies = emp.getProperty("hobbies");
            var addedCount = 0;
            var removedCount = 0;
            hobbies.arrayChanged.subscribe(function(args) {
                addedCount+= args.added ? args.added.length : 0;
                removedCount += args.removed ? args.removed.length : 0;
            });
            if (hobbies.indexOf("tennis") === -1) {
                hobbies.push("tennis");
                hobbies.push("swimming");
                ok(addedCount === 2, "addCount should be 2");
                ok(removedCount === 0, "removed count should be 0");
            } else {
                hobbies.splice(0,hobbies.length, "rock climbing", "reading" );
                ok(addedCount === 2, "addCount should be 2");
                ok(removedCount === 4, "removed count should be 4");
            }

        }).fail(testFns.handleFail).fin(start);
    });

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

    test("add and save orderDetails, notes and lastMod", function () {
        var em = newEm();
        var lastModType = em.metadataStore.getEntityType("LastMod");
        var noteType = em.metadataStore.getEntityType("Note");
        stop();
        var order, ods, newQ, newDate, em2, sameOrder;
        insertOneOrderDetail(em).then(function(sr) {
            order = sr.entities[0];
            ods = order.getProperty("orderDetails");
            newQ = EntityQuery.fromEntities(order);
            em2 = newEm();
            return newQ.using(em2).execute();
        }).then(function(data2){
            sameOrder = data2.results[0];
            var sameOds = sameOrder.getProperty("orderDetails");
            newDate = new Date();
            sameOds.forEach(function(od) {
                var lastMod = od.getProperty("lastModification");
                var notes = od.getProperty("notes");
                if (notes.length >= 2) {
                    notes.pop();
                    notes.pop();
                }
                var note1 = createNote(em, newDate);
                var note2 = createNote(em, newDate);
                notes.push(note1);
                notes.push(note2);
                ok(notes.length === 2, "should be 2 notes");
                lastMod.setProperty("modBy", "WRB");
                lastMod.setProperty("modOn", newDate);
            });
            return em2.saveChanges();
        }).then(function(sr) {
            var orders = sr.entities;
            ok(orders.length === 1, "should have saved 1");
            ok(sameOrder === orders[0], "should be the same order");
            var em3 = newEm();
            return newQ.using(em3).execute();
        }).then(function(data3) {
            var sameOrder2 = data3.results[0];
            var sameOds = sameOrder2.getProperty("orderDetails");
            sameOds.forEach(function(od) {
                var lastMod = od.getProperty("lastModification");
                var lastModDt = lastMod.getProperty("modOn");
                ok(lastModDt.getTime() === newDate.getTime(), "last mod should be the same date");
                var notes = od.getProperty("notes");
                ok(notes.length === 2, "should be 2 notes");
                ok(notes[0].getProperty("createdOn").getTime() === newDate.getTime(), "note should have the same date");
            });
        }).fail(testFns.handleFail).fin(start);
    });

    function createNote(em, newDate) {
        var noteType = em.metadataStore.getEntityType("Note");
        var newNote = noteType.createInstance();
        newNote.setProperty("note", "just another note");
        newNote.setProperty("createdBy", newDate.second);
        newNote.setProperty("createdOn", newDate);
        return newNote;
    }

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

    test("modify and save embedded orderDetails", function () {
        var em = newEm();
        var order, ods, odsLength;
        stop();
        insertOneOrderDetail(em).then(function(sr) {
            order = sr.entities[0];
            ods = order.getProperty("orderDetails");
            odsLength = ods.length;
            var od = breeze.core.arrayFirst(ods, function(od) {
                return od.getProperty("unitPrice") === 999;
            });
            ok(od != null, "should have found this orderDetail");
            od.setProperty("unitPrice", 888);
            return em.saveChanges();
        }).then(function(sr) {
            ok(sr.entities.length === 1, "should have saved 1 rec");
            var sameOrder = sr.entities[0];
            ok(order === sameOrder, "should be the same order");
            var newQ = EntityQuery.fromEntities(order);
            var em2 = newEm();
            return newQ.using(em2).execute();
        }).then(function(data2){
            var sameOrder = data2.results[0];
            ods = order.getProperty("orderDetails");
            var od = breeze.core.arrayFirst(ods, function(od) {
                return od.getProperty("unitPrice") === 888;
            });
            ok(od != null, "should have found this orderDetail");
        }).fail(testFns.handleFail).fin(start);
    });

    test("set orderDetails should be an error", function () {
        var em = newEm();
        var order, ods, odsLength;
        stop();
        return queryTestOrders(em).then(function(data) {
            var orders = data.results;
            order = orders[0];
            ods = order.getProperty("orderDetails");
            try {
                order.setProperty("orderDetails", []);
                ok(false, "should not get here");
            } catch (e) {
                ok(e.message.indexOf("orderDetails")>=0, "should be an exception referring to 'orderDetails'")
            }
        }).fail(testFns.handleFail).fin(start);
    });

    test("reject changes on orderDetails", function () {
        var em = newEm();
        var order, ods, odsLength;
        var orderType = em.metadataStore.getEntityType("Order");
        var odType = em.metadataStore.getEntityType("OrderDetail");
        stop();
        return queryTestOrders(em).then(function(data) {
            var orders = data.results;
            orders.forEach(function(order) {
                ods = order.getProperty("orderDetails");
                var len = ods.length;
                // remove last orderDetail
                ods.pop();
                ods.forEach(function(od){
                    od.setProperty("unitPrice", 777);
                });
                var newOd = odType.createInstance();
                newOd.setProperty("unitPrice", 999 );
                newOd.setProperty("quantity", 999);
                ods.push(newOd);
                ok(ods.length === len,"length should be the same");
            });
            var changes = em.getChanges();
            ok(changes.length === orders.length);
            em.rejectChanges();
            var changes = em.getChanges();
            ok(changes.length === 0);
            var bad = breeze.core.arrayFirst(orders, function(order) {
                return order.getProperty("orderDetails").some(function(od) {
                    return od.getProperty("unitPrice") === 999 || od.getProperty("unitPrice") === 777;
                });
            });
            ok(bad == null, "should not find any changed orders");
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