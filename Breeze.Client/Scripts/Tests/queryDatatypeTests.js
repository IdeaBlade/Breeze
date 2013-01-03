require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var EntityQuery = breeze.EntityQuery;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

    var newEm = testFns.newEm;

    module("queryDatatype", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    test("timestamp", function() {
        var em = newEm();
        var query = new EntityQuery("Roles").take(10);
        stop();
        var role;
        em.executeQuery(query).then(function (data) {
            var results = data.results;
            var roleType = em.metadataStore.getEntityType("Role");
            role = roleType.createEntity();
            role.setProperty("name", "test1");
            role.setProperty("description", "descr 1");
            em.addEntity(role);
            
            return em.saveChanges();
        }).then(function(sr) {
            var ents = sr.entities;
            ok(ents.length === 1);
            var ts = role.getProperty("ts");
            ok(ts, "ts should not be empty now");
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("enums", function () {
        var em = newEm();
        var query = new EntityQuery("Roles").where("roleType", "==", 1);
        var roleType = em.metadataStore.getEntityType("Role");
        stop();
        var role;
        em.executeQuery(query).then(function (data) {
            var results = data.results;
            ok(results.length > 1, "more than one entity should have been queried");
            role = roleType.createEntity();
            role.setProperty("name", "test1");
            role.setProperty("description", "descr 1");
            role.setProperty("roleType", 2);
            em.addEntity(role);
            return em.saveChanges();
        }).then(function(sr) {
            var ents = sr.entities;
            ok(ents.length === 1, "only one entity should have been saved");
            role = ents[0];
            var rt = role.getProperty("roleType");
            ok(rt === 2, "roleType should = 2");
            var q = EntityQuery.fromEntities(ents);
            var em2 = newEm();
            return em2.executeQuery(q);
        }).then(function (data2) {
            var r = data2.results;
            ok(r.length === 1, "only one entity should have been queried");
            role = r[0];
            var rt = role.getProperty("roleType");
            ok(rt === 2, "roleType should = 2");
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("enums null", function () {
        var em = newEm();
        var roleType = em.metadataStore.getEntityType("Role");
        var role = roleType.createEntity();
        role.setProperty("name", "test1");
        role.setProperty("description", "descr 1");
        role.setProperty("roleType", null);
        em.addEntity(role);
        stop();
        em.saveChanges().then(function (sr) {
            var ents = sr.entities;
            ok(ents.length === 1);
            role = ents[0];
            var rt = role.getProperty("roleType");
            ok(rt == null, "roleType should be null");
            var q = EntityQuery.fromEntities(ents);
            q = q.where("roleType", "==", null);
            var em2 = newEm();
            return em2.executeQuery(q);
        }).then(function (data) {
            var r = data.results;
            ok(r.length === 1, "only one entity should have been queried");
            role = r[0];
            var rt = role.getProperty("roleType");
            ok(rt == null, "roleType should = null");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("nullable int", function () {
        var em = newEm();
        var query = new EntityQuery("Customers")
            .where("rowVersion", "==", 1)
            .take(10);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("nullable int == null", function () {
        var em = newEm();
        var query = new EntityQuery("Customers")
            .where("rowVersion", "==", null)
            .take(10);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("nullable date", function () {
        var em = newEm();
        var query = new EntityQuery("Orders")
            .where("orderDate", ">", new Date(1998, 1, 1))
            .take(10);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("nullable date == null", function () {
        var em = newEm();
        var query = new EntityQuery("Orders")
            .where("orderDate", "==", null)
            .take(10);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0);
        }).fail(testFns.handleFail).fin(start);
    });
    
    // we don't have a nullable book in NorthwindIB
    test("bool", function () {
        var em = newEm();
        var query = new EntityQuery("Products")
            .where("isDiscontinued", "==", true)
            .take(10);
        stop();
        em.executeQuery(query).then(function(data) {
            var products = data.results;
            ok(products.length > 0);
            ok(products.every(function(p) {
                return p.getProperty("isDiscontinued") === true;
            }));
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("nonnullable bool == null", function () {
        var em = newEm();
        var query = new EntityQuery("Products")
            .where("discontinued", "==", null)
            .take(30);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(false);
        }).fail(function(error) {
            // TODO: let see if we can't improve this error message.
            var x = error;
            ok(true, "should get here");
        }).fin(start);
    });

    test("nullable guid", function () {
        // ID of the Northwind "Alfreds Futterkiste" customer
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var em = newEm();
        var query = new EntityQuery("Orders")
                .where("customerID", "==", alfredsID);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
        }).fail(testFns.handleFail).fin(start);
    });

    test("nullable guid == null", function () {
        var em = newEm();
        var query = new EntityQuery("Orders")
            .where("customerID", "==", null)
            .take(10);
        stop();
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0, "should have Alfreds Orders.");
        }).fail(testFns.handleFail).fin(start);
    });

    test("string equals null", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("region", FilterQueryOp.Equals, null)
            .take(20);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var customers = data.results;
            ok(customers.length > 0);
            customers.forEach(function(customer) {
                var region = customer.getProperty("region");
                ok(region == null, "region should be either null or undefined");
            });
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("string not equals null", function () {
        var em = newEm();

        var query = new EntityQuery()
            .from("Customers")
            .where("region", FilterQueryOp.NotEquals, null)
            .take(10);

        var queryUrl = query._toUri(em.metadataStore);
        stop();
        em.executeQuery(query, function(data) {
            var customers = data.results;
            ok(customers.length > 0);
            customers.forEach(function(customer) {
                var region = customer.getProperty("region");
                ok(region != null, "region should not be either null or undefined");
            });

        }).fail(testFns.handleFail).fin(start);
    });

    return testFns;

});

