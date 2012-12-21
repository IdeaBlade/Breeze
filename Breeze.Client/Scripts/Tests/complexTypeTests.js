require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;


    var EntityQuery = breeze.EntityQuery;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;
    var EntityType = breeze.EntityType;
    var ComplexType = breeze.ComplexType;
    

    var newEm = testFns.newEm;

    module("complexTypes", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });


    test("query complex", function () {
        var em = newEm();
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");
        
        stop();
        em.executeQuery(q).then(function (data) {
            
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var location = supplier0.getProperty("location");
            ok(location, "location should exist");
            var city = location.getProperty("city");
            ok(city.length > 0, "city should exist");
            ok(location.complexAspect != null, "location.complexAspect should exist");
            ok(location.complexAspect.entityAspect === supplier0.entityAspect, "location.complexAspect should exist");

            var supplierType = em.metadataStore.getEntityType("Supplier");
            ok(supplierType instanceof EntityType, "locationType should be instanceof ComplexType");
            var locationType = em.metadataStore.getEntityType("Location");
            ok(locationType instanceof ComplexType, "locationType should be instanceof ComplexType");
            ok(location.complexType === locationType);

        }).fail(testFns.handleFail).fin(start);
    });

    test("modify complex property", function () {
        var em = newEm();
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var location = supplier0.getProperty("location");
            location.setProperty("city", "foo");
            ok(supplier0.entityAspect.entityState.isModified(), "supplier should be modified");

        }).fail(testFns.handleFail).fin(start);
    });

    test("assign complex property", function () {
        var em = newEm();
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var supplier1 = r[1];
            var location0 = supplier0.getProperty("location");
            supplier1.setProperty("location", location0);
            ok(supplier1.entityAspect.entityState.isModified(), "supplier1 should be modified");
            var location1 = supplier1.getProperty("location");
            ok(location1 != location0, location1 != location0);
            location0.setProperty("city", "foo");
            ok(supplier0.entityAspect.entityState.isModified(), "supplier0 should be modified");
            ok(location1.getProperty("city") !== "foo", "location1.city should not == 'foo'");

        }).fail(testFns.handleFail).fin(start);
    });
    
    test("assign complex property with null", function () {
        var em = newEm();
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var location0 = supplier0.getProperty("location");
            try {
                supplier0.setProperty("location", null);
                ok(false, "shouldn't get here");
            } catch(e) {
                ok(e.message.toLowerCase().indexOf("complextype") >= 0, "message should mention complexType");
            }


        }).fail(testFns.handleFail).fin(start);
    });
    
    test("create a complex tye instance and assign it", function () {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        var newLocation = locationType.createInstance();
        newLocation.setProperty("city", "bar");
        
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var location0 = supplier0.getProperty("location");
            supplier0.setProperty("location", newLocation);
            ok(location0.getProperty("city") === "bar", "city should have value 'bar'");
            ok(location0 != newLocation, "locations should not be the same object");
            
        }).fail(testFns.handleFail).fin(start);
    });

    test("create a complex type instance with custom constructor", function () {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        em.metadataStore.registerEntityTypeCtor("Location", function() {
            this.xtraName = "test";
        });
        var newLocation = locationType.createInstance();
        newLocation.setProperty("city", "bar");

        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var location0 = supplier0.getProperty("location");
            supplier0.setProperty("location", newLocation);
            ok(location0.getProperty("city") === "bar", "city should have value 'bar'");
            ok(location0 != newLocation, "locations should not be the same object");

        }).fail(testFns.handleFail).fin(start);
    });
    
    return testFns;

});

