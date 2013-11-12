(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    
    var EntityQuery = breeze.EntityQuery;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var EntityState = breeze.EntityState;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

    var newEm = testFns.newEm;
    
    module("no tracking", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    test("self referential type query", function () {
        var em = newEm();
        var predicate1 = Predicate.create("lastName", "startsWith", "D").or("firstName", "startsWith", "A");
        
        var q = EntityQuery
            .from("Employees")
            .where(predicate1)
            .noTracking();
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var count = 0;
            r.forEach(function (emp) {
                if (emp.manager) {
                    ok(emp.manager.directReports.indexOf(emp) >= 0, "manager/direct reports relation not resolved properly");
                    count+=1;
                }
                if (emp.directReports && emp.directReports.length > 0) {
                    emp.directReports.forEach(function (dr) {
                        ok(dr.manager === emp, "directReports/manager relation not resolved properly");
                    });
                    count+=1;
                }
            });
            ok(count >= 2, "should be at least 1 bidirectional relation");
            var r2 = em.executeQueryLocally(q);
            ok(r2.length == 0);
        }).fail(testFns.handleFail).fin(start);
    });

    test("query with expand", function () {
        var em = newEm();


        var q = EntityQuery
            .from("Orders")
            .where("customer.companyName", "startsWith", "C")
            .expand("customer")
            .noTracking();
        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            
            var customers = [];
            r.forEach(function (order) {
                if (order.customer) {
                    customers.push(order.customer);
                }
            });
            ok(customers.length > 2, "should be at least 2 customers");
            var uniqCustomers = testFns.arrayDistinct(customers);
            ok(uniqCustomers.length < customers.length, "should be some dup customers");
            var r2 = em.executeQueryLocally(q);
            ok(r2.length == 0);
        }).fail(testFns.handleFail).fin(start);
    });

    test("query with complex type", function () {
        var em = newEm();

        var query = new EntityQuery()
         .from("Suppliers")
         .take(3)
         .noTracking();
        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query).then(function (data) {
            var suppliers = data.results;
            ok(suppliers.length > 0, "empty data");
            
            suppliers.forEach(function (s) {
                ok(s.location, "every supplier should have a location property");
                ok("city" in s.location, "should have found s.location.city")
            });
            var r2 = em.executeQueryLocally(query);
            ok(r2.length == 0);
        }).fail(testFns.handleFail).fin(start);

    });

    test("query with reattach", function () {

        var em = newEm();
        var predicate1 = Predicate.create("lastName", "startsWith", "D").or("firstName", "startsWith", "A");
        
        var q = EntityQuery
            .from("Employees")
            .where(predicate1)
            .noTracking();
        stop();
        var empType = em.metadataStore.getEntityType("Employee");
        var emps;
        em.executeQuery(q).then(function (data) {
            var rawEmps = data.results;
            ok(rawEmps.length > 0);
            emps = rawEmps.map(function (rawEmp) {
                emp = empType.createEntity(rawEmp);
                empx = em.attachEntity(emp, EntityState.Unchanged, MergeStrategy.SkipMerge);
                return empx;
            });
            ok(emps.length = rawEmps.length);
            emps.forEach(function (emp) {
                ok(emp.entityType === empType, "should be empType");
                ok(emp.entityAspect.entityState === EntityState.Unchanged);
            });
            var q2 = q.noTracking(false);
            var emps2 = em.executeQueryLocally(q2);
            ok(emps2.length === emps.length, "local query should resolve to same entities");
            emps2.forEach(function(emp) {
                ok(emps.indexOf(emp) >= 0, "local emps should be the same");
            });
            return em.executeQuery(q2);
        }).then(function(data2) {
            var emps3 = data2.results;
            emps3.forEach(function (emp) {
                ok(emps.indexOf(emp) >= 0, "queried emps should be the same");
            });
        
        }).fail(testFns.handleFail).fin(start);

    });
    
    
    test("query with reattach - using em.createEntity", function () {

        var em = newEm();
        var predicate1 = Predicate.create("lastName", "startsWith", "D").or("firstName", "startsWith", "A");

        var q = EntityQuery
            .from("Employees")
            .where(predicate1)
            .noTracking();
        stop();
        var empType = em.metadataStore.getEntityType("Employee");
        var emps;
        em.executeQuery(q).then(function (data) {
            var rawEmps = data.results;
            ok(rawEmps.length > 0);
            emps = rawEmps.map(function (rawEmp) {
                emp = em.createEntity(empType, rawEmp, EntityState.Unchanged, MergeStrategy.SkipMerge);
                return emp;
            });
            ok(emps.length = rawEmps.length);
            emps.forEach(function (emp) {
                ok(emp.entityType === empType, "should be empType");
                ok(emp.entityAspect.entityState === EntityState.Unchanged, "should be unchanged, but was: " + emp.entityAspect.entityState);
            });
            var q2 = q.noTracking(false);
            var emps2 = em.executeQueryLocally(q2);
            ok(emps2.length === emps.length, "local query should resolve to same entities");
            emps2.forEach(function (emp) {
                ok(emps.indexOf(emp) >= 0, "local emps should be the same");
            });
            return em.executeQuery(q2);
        }).then(function (data2) {
            var emps3 = data2.results;
            emps3.forEach(function (emp) {
                ok(emps.indexOf(emp) >= 0, "queried emps should be the same");
            });

        }).fail(testFns.handleFail).fin(start);

    });


    test("query with expand and reattach ", function () {

        var em = newEm();
        var predicate1 = Predicate.create("firstName", "startsWith", "A");

        var q = EntityQuery
            .from("Employees")
            .where(predicate1)
            .expand("orders")
            .noTracking();
        stop();
        var empType = em.metadataStore.getEntityType("Employee");
        var orderType = em.metadataStore.getEntityType("Order");
        var emps;
        em.executeQuery(q).then(function (data) {
            var rawEmps = data.results;
            ok(rawEmps.length > 0);
            emps = rawEmps.map(function (rawEmp) {
                emp = empType.createEntity(rawEmp);
                empx = em.attachEntity(emp, EntityState.Unchanged, MergeStrategy.SkipMerge);
                return empx;
            });
            ok(emps.length = rawEmps.length);
            emps.forEach(function (emp) {
                ok(emp.entityType === empType, "should be empType");
                ok(emp.entityAspect.entityState === EntityState.Unchanged);
                var orders = emp.getProperty("orders");
                ok(orders.length > 0, "should be some orders");
                orders.forEach(function (o) {
                    ok(o.entityType === orderType, "should be orderType");
                    ok(o.entityAspect.entityState === EntityState.Unchanged);
                });
            });
            var q2 = q.noTracking(false);
            var emps2 = em.executeQueryLocally(q2);
            ok(emps2.length === emps.length, "local query should resolve to same entities");
            emps2.forEach(function (emp) {
                ok(emps.indexOf(emp) >= 0, "local emps should be the same");
            });
            return em.executeQuery(q2);
        }).then(function (data2) {
            var emps3 = data2.results;
            emps3.forEach(function (emp) {
                ok(emps.indexOf(emp) >= 0, "queried emps should be the same");
            });

        }).fail(testFns.handleFail).fin(start);

    });


    
})(breezeTestFns);
