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
    var Predicate = breeze.Predicate;
    
    var newEm = testFns.newEm;
    

    module("mongo any/all", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    test("query same field twice", function () {
        var manager = newEm();
        var p = Predicate.create("freight", ">", 100).and("freight", "<", 200);

        var query = new breeze.EntityQuery()
            .from("Orders")
            .where(p);
        stop();
        manager.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length > 0, "should be some results");
            orders.forEach(function(o) {
                var f = o.getProperty("freight");
                if (f > 100 && f < 200) {

                } else {
                    ok(false, "freight should be > 100 and < 200");
                }
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("query contains", function () {
        var manager = newEm();
        var p = Predicate.create("city", "contains", 'on');

        var query = new breeze.EntityQuery()
            .from("Employees")
            .where(p);
        stop();
        manager.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length > 0, "should be some results");
            emps.forEach(function(o) {
                var city = o.getProperty("city");
                if (city.indexOf("on") === -1) {
                    ok(false, "city should contain 'on'");
                }
            });
        }).fail(testFns.handleFail).fin(start);
    });

    test("query same field twice with string ops", function () {
        var manager = newEm();
        var p = Predicate.create("city", "contains", 'on').and("city", "startsWith", "L");

        var query = new breeze.EntityQuery()
            .from("Employees")
            .where(p);
        stop();
        manager.executeQuery(query).then(function (data) {
            var emps = data.results;
            ok(emps.length > 0, "should be some results");
            emps.forEach(function(o) {
                var city = o.getProperty("city");
                if (city.indexOf("on") === -1) {
                    ok(false, "city should contain 'on'");
                }
                if (city.substring(0,1) !== "L") {
                    ok(false, "city should start with 'L'");
                }
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    if (!testFns.DEBUG_MONGO) {
        test("Skipping Mongo specific tests", function () {
            ok(true, "Skipped tests - mongo specfic");
        });
        return;
    };

    // same as above
    // Order.OrderDetails.any(UnitPrice > 100);
    // {
    //    "OrderDetails.UnitPrice": { $gte: 100 }
    // }
    test("any and gt", function () {
        var em = newEm();
        var query = EntityQuery.from("Orders")
            .where("orderDetails", "any", "unitPrice",  ">", 100);
        stop();
        em.executeQuery(query).then(function (data) {
            var recs = data.results;
            ok(recs.length === 46, "should be 46 recs but were " + recs.length);
        }).fail(testFns.handleFail).fin(start);

    });

    test("any and gt (local)", function () {
        var em = newEm();
        var query = EntityQuery.from("Orders")
            .where("orderDetails", "any", "unitPrice",  ">", 100);
        stop();
        em.executeQuery(query).then(function (data) {
            var recs = data.results;

            var recs2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(recs, recs2);
            ok(isOk, "arrays should have the same contents");
        }).fail(testFns.handleFail).fin(start);

    });

    test("any with not", function () {
        var em = newEm();
        // Orders with no orderDetails
        var p = Predicate.create("orderDetails", "any", "rowVersion", ">=", 0).not();
        var query = EntityQuery.from("Orders").where(p);

        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                ok(orderDetails.length === 0, "every orderDetails collection should be empty");
            })

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("any with != null", function () {
        var em = newEm();
        // orders with no orderDetails
        var p = Predicate.create("orderDetails", "any", "rowVersion", "!=", null).not();
        var query = EntityQuery.from("Orders").where(p);

        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                ok(orderDetails.length === 0, "every orderDetails collection should be empty");
            })

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    // TODO: add a nested property to OrderDetail
//    test("any and nested property", function () {
//        var em = newEm();
//        var query = EntityQuery.from("Employees")
//            .where("orders", "any", "customer.companyName", "startsWith", "Lazy")
//            .expand("orders.customer");
//        stop();
//        em.executeQuery(query).then(function (data) {
//            var emps = data.results;
//            ok(emps.length === 2, "should be only 2 emps with orders with companys named 'Lazy...' ");
//            emps.forEach(function (emp) {
//                var orders = emp.getProperty("orders");
//                var isOk = orders.some(function (order) {
//                    var cust = order.getProperty("customer");
//                    return cust.getProperty("companyName").indexOf("Lazy") >= 0;
//                });
//                ok(isOk, "should be some order with the right company name");
//            });
//
//            var emps2 = em.executeQueryLocally(query);
//            var isOk = testFns.haveSameContents(emps, emps2);
//            ok(isOk, "arrays should have the same contents");
//        }).fail(testFns.handleFail).fin(start);
//
//    });

    test("any with composite AND predicate", function () {
        var em = newEm();
        var p = Predicate.create("unitPrice", ">=", 50).and("quantity", ">=", 50);
        var query = EntityQuery.from("Orders")
            .where("orderDetails", "any", p);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length > 0, "should be some orders");
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                var isOk = orderDetails.some(function (od) {
                    return od.getProperty("unitPrice") >= 50 && od.getProperty("quantity") >= 50;
                });
                ok(isOk, "should be some order with both criteria satisfied");
            });

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("any with composite OR predicate", function () {
        var em = newEm();
        var p = Predicate.create("unitPrice", "<", 3, 50).or("quantity", "<", 2);
        var query = EntityQuery.from("Orders")
            .where("orderDetails", "any", p);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length > 0, "should be some orders");
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                var isOk = orderDetails.some(function (od) {
                    return od.getProperty("unitPrice") < 3 || od.getProperty("quantity") < 2;
                });
                ok(isOk, "should be some order with both criteria satisfied");
            });

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });


    test("two anys", function () {
        // different query than one above.
        var em = newEm();
        var p = Predicate.create("orderDetails", "any", "unitPrice", ">=", 50)
            .and("orderDetails", "any", "quantity", ">=", 50);
        var query = EntityQuery.from("Orders")
            .where(p);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length > 0, "should be some orders");
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                var isOk = orderDetails.some(function (od) {
                    return od.getProperty("unitPrice") >= 50;
                });
                ok(isOk, "should be some order with unitPrice >= 50");
                var isOk = orderDetails.some(function (od) {
                    return od.getProperty("quantity") >= 50;
                });
                ok(isOk, "should be some order with quantity >= 50");
            });

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");
        }).fail(testFns.handleFail).fin(start);

    });

    // TODO: need a nested nav path
//    test("nested any", function () {
//        // different query than one above.
//        var em = newEm();
//        var q1 = EntityQuery.from("Customers")
//            .where("orders", "any", "orderDetails", "some", "unitPrice", ">", 200);
//
//        var p2 = new Predicate("unitPrice", ">", 200).and("quantity", ">", 50);
//        var q2 = EntityQuery.from("Customers")
//            .where("orders", "some", "orderDetails", "any", p2)
//            .expand("orders.orderDetails");
//
//        var queryUrl = q2._toUri(em.metadataStore);
//        stop();
//        var custs, l0;
//        em.executeQuery(q1).then(function (data) {
//            custs = data.results;
//            l0 = custs.length;
//            ok(l0 > 10);
//            return em.executeQuery(q2);
//        }).then(function(data2) {
//                custs = data2.results;
//                l2 = custs.length;
//                ok(l2 < l0, "2nd query should return fewer records.");
//
//                var custs2 = em.executeQueryLocally(q2);
//                var isOk = testFns.haveSameContents(custs, custs2);
//                ok(isOk, "arrays should have the same contents");
//
//            }).fail(testFns.handleFail).fin(start);
//
//    });


    test("any error", function () {
        var em = newEm()
        var p = new Predicate("freight", ">", 200).and("XXX", ">", 50);

        var q2 = EntityQuery.from("Orders")
            .where(p);

        try {
            var queryUrl = q2._toUri(em.metadataStore);
            ok(false, "should not get here")
        } catch (e) {
            ok(e.message.indexOf("XXX") >= 0, "error should be about 'XXX'");
        }

    });

    test("all with or'd predicates ", function () {
        var em = newEm();
        var subp = Predicate.create("quantity", "<", 3).or("unitPrice", "<", 3);

        var p = Predicate.create("orderDetails", "all", subp);
        var query = EntityQuery.from("Orders").where(p);

        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length > 0, "should be some orders");
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                var isOk = orderDetails.every(function (o) {
                    return o.getProperty("quantity") < 3 || o.getProperty("unitPrice") < 3;
                });
                ok(isOk, "every orderDetail should satisfy condition");
            })

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("all with and'd predicates ", function () {
        var em = newEm();
        var subp = Predicate.create("quantity", "<", 10).and("unitPrice", "<", 10);

        var p = Predicate.create("orderDetails", "all", subp);
        var query = EntityQuery.from("Orders").where(p);
        var orders;
        stop();
        em.executeQuery(query).then(function (data) {
            orders = data.results;
            ok(orders.length > 0, "should be some orders");
            orders.forEach(function (order) {
                var orderDetails = order.getProperty("orderDetails");
                var isOk = orderDetails.every(function (o) {
                    return o.getProperty("quantity") < 10 && o.getProperty("unitPrice") < 10;
                });
                ok(isOk, "every orderDetail should satisfy condition");
            })

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });

    test("create and attach nonscalar complex instances", function () {
        var em = newEm();
        var em2 = newEm();
        var subp = Predicate.create("quantity", "<", 10).and("unitPrice", "<", 10);

        var p = Predicate.create("orderDetails", "all", subp);
        var query = EntityQuery.from("Orders").where(p);
        var noteType = em.metadataStore.getEntityType("Note");
        var orders;
        stop();

        em.executeQuery(query).then(function (data) {
            orders = data.results;
            ok(orders.length > 0, "should be some orders");
            // need to add some data
            orders = data.results;
            orders.forEach(function(order) {
                addNotes(order,noteType)
            })
            return em.saveChanges();
        }).then(function(sr) {
            subp = subp.and("notes", "any", "note", "startsWith", "Test");
            var q = EntityQuery.from("Orders").where("orderDetails", "all", subp);
            return em2.executeQuery(q);
        }).then(function(data2) {
            orders2 = data2.results;
            ok(orders2.length === orders.length, "should be same number of orders");
        }).fail(testFns.handleFail).fin(start);

    });

    function addNotes(order, noteType) {
        var ods = order.getProperty("orderDetails");
        var ix = 1;
        ods.forEach(function(od) {
            var notes = od.getProperty("notes");
            var hasTestNotes = notes.some(function(note) {
                return note.getProperty("note").indexOf("Test")=== 0;
            });
            if (!hasTestNotes) {
                for (var i = 1; i<3; i++) {
                    var note = noteType.createInstance();
                    note.setProperty("note", "Test note #: " + ix++);
                    note.setProperty("createdBy", "JT");
                    note.setProperty("createdOn", new Date());
                    notes.push(note);
                }
            }
        })
    }


    test("all with composite predicates ", function () {
        var em = newEm();
        var p2 = Predicate.create("quantity", "<", 30);
        var p1 = Predicate.create("orderDetails", "all", p2);
        var p0 = Predicate.create("freight", ">", 200).and(p1);

        var query = EntityQuery.from("Orders").where(p0);

        stop();
        em.executeQuery(query).then(function (data) {
            var orders = data.results;
            ok(orders.length > 0, "should be some orders");
            orders.forEach(function (order) {
                ok(order.getProperty("freight") > 200, "freight should be > 200");
                var orderDetails = order.getProperty("orderDetails");
                var isOk = orderDetails.every(function (o) {
                    return o.getProperty("quantity") < 30;
                });
                ok(isOk, "every orderDetail should have a quantity < 30");
            })

            var orders2 = em.executeQueryLocally(query);
            var isOk = testFns.haveSameContents(orders, orders2);
            ok(isOk, "arrays should have the same contents");

        }).fail(testFns.handleFail).fin(start);

    });


})(breezeTestFns);