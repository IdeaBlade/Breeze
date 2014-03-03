( function (testFns) {
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

    //  create an entity (that has a complex type).
    //  Make a change to a string property of the complex type of the entity created. "test"
    //  save changes (accepting all changes).
    //  reload from db/remote source the same entity.
    //  make changes to the same string property of the complex type. "testED"
    //  Call manager.RevertChanges()..

    test("rejectChanges after save of new entity", function () {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        var supplier = em.createEntity("Supplier", { companyName: "Test1" });
        var location = supplier.getProperty("location");
        location.setProperty("city", "LA")
        stop();
        em.saveChanges().then(function (sr) {
            var saved = sr.entities;
            ok(saved.length === 1, "should have saved one record");
            location = supplier.getProperty("location");
            ok(location.getProperty("city") === "LA", "location.city should be 'LA'");
            return em.fetchEntityByKey(supplier.entityAspect.getKey());
        }).then(function (fr) {
            supplier2 = fr.entity;
            ok(supplier === supplier2, "should be the same supplier");
            location = supplier.getProperty("location");
            location.setProperty("city", "FOOO");
            supplier.entityAspect.rejectChanges();
            ok(location.getProperty("city") === "LA", "location.city should be 'LA'");
        }).fail(testFns.handleFail).fin(start);
    });

    test("create entity with complexType property", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        
        var supplier = em.createEntity("Supplier", { companyName: "XXX", location: { city: "LA", postalCode: "44444" } });
        ok(supplier.getProperty("companyName") === "XXX");
        ok(supplier.getProperty("location").getProperty("city") === "LA");
    });

    test("create entity with complexType property 2", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));

        var supplier = em.createEntity("Supplier", { companyName: "XXX" });
        supplier.getProperty("location").setProperty("city","San Francisco");
        supplier.getProperty("location").setProperty("postalCode", "91333");
        ok(supplier.getProperty("location").getProperty("city") === "San Francisco");

        var locationType = em.metadataStore.getEntityType("Location");
        supplier.setProperty("location", locationType.createInstance({ city: "Boston", postalCode: "12345" }));
        ok(supplier.getProperty("location").getProperty("city") === "Boston");
    });

    test("initializer on complexType for createInstance", function () {

        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Supplier = testFns.models.Supplier();

        var locationInitializer = function (location) {
            location.setProperty("city", "FOO");
        };
        em.metadataStore.registerEntityTypeCtor("Location", null, locationInitializer);


        var locationType = em.metadataStore.getEntityType("Location");
        var newLocation = locationType.createInstance();
        var city = newLocation.getProperty("city");
        ok(city === "FOO", "city should === 'FOO'");

    });

    test("initializer on complexType during query",  function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Supplier = testFns.models.Supplier();

        var locationInitializer = function (location) {
            var city = location.getProperty("city");
            ok(city, "city name should not be null");
            location.setProperty("city", "Z" + city);
        };

        em.metadataStore.registerEntityTypeCtor("Location", null, locationInitializer);

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
            ok(city.indexOf("Z") === 0, "city should start with 'Z'");
        
        }).fail(testFns.handleFail).fin(start);
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
            ok(location.complexAspect.getEntityAspect() === supplier0.entityAspect, "location.complexAspect should exist");

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
    
    test("create an instance and assign it", function () {
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

    test("create an instance with custom ctor and unmapped prop", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Location = testFns.models.Location();

        var locationType = em.metadataStore.getEntityType("Location");
        em.metadataStore.registerEntityTypeCtor("Location", Location, "init");

        var newLocation = locationType.createInstance();
        newLocation.setProperty("extraName", "newValue");
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
            ok(location0.getProperty("extraName") === "newValue", "extraName should have value 'newValue'");
            ok(location0 != newLocation, "locations should not be the same object");

        }).fail(testFns.handleFail).fin(start);
    });

    test("create an entity instance with a populated complex type", function () {
        var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
        var Location = testFns.models.Location();
        var locationType = em.metadataStore.getEntityType("Location");
        em.metadataStore.registerEntityTypeCtor("Location", Location, "init");

        var newLocation = locationType.createInstance();
        newLocation.setProperty("extraName", "newValue");
        newLocation.setProperty("city", "bar");
        var supplier = em.createEntity("Supplier", { location: newLocation });     

        var location0 = supplier.getProperty("location");
        ok(location0.getProperty("city") === "bar", "city should have value 'bar'");
        ok(location0.getProperty("extraName") === "newValue", "extraName should have value 'newValue'");
        ok(location0 != newLocation, "locations should not be the same object");

        
    });

    // TODO: right now this will fail because we don't yet support attaching an entity created with new that has populated complexTypes.
    // change needs to be made to each of the modelLibraries. 
    //test("new an entity instance with a populated complex type", function () {
    //    var em = newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
    //    var Supplier = testFns.models.Supplier();
        

    //    em.metadataStore.registerEntityTypeCtor("Supplier", Supplier);

    //    var Location = testFns.models.Location();
    //    var locationType = em.metadataStore.getEntityType("Location");
    //    em.metadataStore.registerEntityTypeCtor("Location", Location, "init");
        
    //    var supplier = new Supplier();
    //    supplier.companyName = "Foo";
    //    var location = { extraName: "newValue", city: "bar" };
    //    supplier.location = location;
    //    em.addEntity(supplier);

    //    companyName0 = supplier.getProperty("companyName");
    //    ok(companyName0 === "Foo", "companyName should be Foo");
    //    var location0 = supplier.getProperty("location");
    //    ok(location0.getProperty("city") === "bar", "city should have value 'bar'");
    //    ok(location0.getProperty("extraName") === "newValue", "extraName should have value 'newValue'");
    //    ok(location0 != location, "locations should not be the same object");


    //});

    
    test("rejectChanges", function () {
        var em = newEm();
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            var location0 = supplier0.getProperty("location");
            var origCity = location0.getProperty("city");
            location0.setProperty("city", "aargh");
            supplier0.entityAspect.rejectChanges();
            var sameCity = location0.getProperty("city");
            ok(origCity === sameCity, 'cities should be the same');


        }).fail(testFns.handleFail).fin(start);
    });


    test("property change event tracking", function() {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        var newLocation = locationType.createInstance();
        newLocation.setProperty("city", "bar");
        var pred = Predicate.create("companyName", "startsWith", "P")
            .and("location.address", "!=", null)
            .and("location.city", "!=", null)
            
        var q = EntityQuery.from("Suppliers").where(pred);
            

        stop();
        var lastEcArgs;
        var entityChangedArgs = [];
        
        var lastPcArgs;
        var propertyChangedArgs = [];
        em.executeQuery(q).then(function(data) {
            var r = data.results;
            ok(r.length > 0);
            var supplier0 = r[0];
            em.entityChanged.subscribe(function(args) {
                lastEcArgs = args;
                entityChangedArgs.push(args);
            });
            supplier0.entityAspect.propertyChanged.subscribe(function(args) {
                lastPcArgs = args;
                propertyChangedArgs.push(args);
            });
            var location0 = supplier0.getProperty("location");
            var nonnullCount = (location0.getProperty("address") ? 1 : 0) +
                (location0.getProperty("city") ? 1 : 0) +
                (location0.getProperty("region") ? 1 : 0) +
                (location0.getProperty("postalCode") ? 1 : 0) +
                (location0.getProperty("country") ? 1 : 0);
            
            supplier0.setProperty("location", newLocation);
            // 6 = 5 properties + 1 for parent
            
            ok(propertyChangedArgs.length === (nonnullCount + 1), "should have been " + (nonnullCount+1) + " pchange events");
            ok(lastPcArgs.entity === supplier0, "lastPcArgs.entity === supplier0");
            ok(lastPcArgs.property.name === "location");
            // 7 = 6 + 1 entityState change
            ok(entityChangedArgs.length === (nonnullCount + 2), "should have been  " + (nonnullCount + 2) + " echange events");
            ok(lastEcArgs.entity === supplier0, "lastPcArgs.entity === supplier0");
            ok(lastEcArgs.args.property.name === "location");
            
            location0.setProperty("city", "newCity");
            // + 1 (pchange and echange)
            ok(propertyChangedArgs.length === nonnullCount + 2, "should have been  " + (nonnullCount + 2) + " pchange events");
            ok(lastPcArgs.entity === supplier0, "lastPcArgs.entity === supplier0");
            ok(lastPcArgs.property.name === "city");
            ok(lastPcArgs.propertyName === "location.city");
            ok(entityChangedArgs.length === nonnullCount + 3, "should have been  " + (nonnullCount + 3) + " echange events");
            ok(lastEcArgs.entity === supplier0, "lastPcArgs.entity === supplier0");
            ok(lastEcArgs.args.propertyName === "location.city");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("save changes - modified - only cp", function() {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        var val = "foo-" + Date.now().toString().substr(5);
        var oldVal;
        var companyName;
        em.executeQuery(q).then(function(data) {
            var r = data.results;
            ok(r.length > 0, "should be at least one record");
            var supplier0 = r[0];
            companyName = supplier0.getProperty("companyName");
            var location0 = supplier0.getProperty("location");
            oldVal = location0.getProperty("city");
            location0.setProperty("city", val);
            ok(val != oldVal, "city values should not match here");
            return em.saveChanges();
        }).then(function(sr) {
            var saved = sr.entities;
            ok(saved.length === 1, "should have saved one record");
            var q2 = EntityQuery.from("Suppliers")
                .where("location.city", "==", val);
            var em2 = newEm();
            return em2.executeQuery(q2);
        }).then(function(data2) {
            var results = data2.results;
            ok(results.length === 1, "should have requeried 1 record");
            var supplier2 = results[0];
            ok(supplier2.getProperty("companyName") == companyName, "companyNames should match");
            var val2 = supplier2.getProperty("location").getProperty("city");
            ok(val2 == val, "values should be the same");
            
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("save changes - modified - both cp and non-cp", function () {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        var newCity = "foo-" + Date.now().toString().substr(5);
        
        var newCompanyName;
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be at least one record");
            var supplier0 = r[0];
            var companyName = supplier0.getProperty("companyName");
            newCompanyName = testFns.morphString(companyName);
            supplier0.setProperty("companyName", newCompanyName);
            
            var location0 = supplier0.getProperty("location");
            var oldCity = location0.getProperty("city");
            location0.setProperty("city", newCity);
            ok(newCity != oldCity, "city values should not match here");
            return em.saveChanges();
        }).then(function (sr) {
            var saved = sr.entities;
            ok(saved.length === 1, "should have saved one record");
            var q2 = EntityQuery.from("Suppliers")
                .where("location.city", "==", newCity);
            var em2 = newEm();
            return em2.executeQuery(q2);
        }).then(function (data2) {
            var results = data2.results;
            ok(results.length === 1, "should have requeried 1 record");
            var supplier2 = results[0];
            ok(supplier2.getProperty("companyName") == newCompanyName, "companyNames should match");
            var city2 = supplier2.getProperty("location").getProperty("city");
            ok(city2 == newCity, "values should be the same");

        }).fail(testFns.handleFail).fin(start);
    });
    
    test("save changes - modified - no cp", function () {
        var em = newEm();
        var locationType = em.metadataStore.getEntityType("Location");
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");

        stop();
        var newCompanyName;
        em.executeQuery(q).then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should be at least one record");
            var supplier0 = r[0];
            var companyName = supplier0.getProperty("companyName");
            newCompanyName = testFns.morphString(companyName);
            
            supplier0.setProperty("companyName", newCompanyName);
            return em.saveChanges();
        }).then(function (sr) {
            var saved = sr.entities;
            ok(saved.length === 1, "should have saved one record");
            var q2 = EntityQuery.from("Suppliers")
                .where("companyName", "==", newCompanyName);
            var em2 = newEm();
            return em2.executeQuery(q2);
        }).then(function (data2) {
            var results = data2.results;
            ok(results.length === 1, "should have requeried 1 record");
            var supplier2 = results[0];
            ok(supplier2.getProperty("companyName") == newCompanyName, "companyNames should match");

        }).fail(testFns.handleFail).fin(start);
    });
    
    test("save changes - added", function () {
        var em = newEm();
        var supplierType = em.metadataStore.getEntityType("Supplier");
        var locationType = em.metadataStore.getEntityType("Location");
        var companyName = "Test-" + Date.now().toString().substr(5);
        var supplier = supplierType.createEntity({
            companyName: companyName
        });
        var location = supplier.getProperty("location");
        location.setProperty("region", "USA");
        location.setProperty("address", "123 Main St.");
        location.setProperty("city", "anywhere");
        em.addEntity(supplier);

        stop();
        
        em.saveChanges().then(function (sr) {
            var saved = sr.entities;
            ok(saved.length === 1, "should have saved one record");
            var q2 = EntityQuery.from("Suppliers")
                .where("location.city", "==", "anywhere")
                .where("companyName", "==", companyName);
            var em2 = newEm();
            return em2.executeQuery(q2);
        }).then(function (data2) {
            var results = data2.results;
            ok(results.length === 1, "should have requeried 1 record");
            var supplier2 = results[0];
            ok(supplier2.getProperty("companyName") == companyName, "companyNames should match");
            var city2 = supplier2.getProperty("location").getProperty("city");
            ok(city2 == "anywhere", "cities should be the same");
            var location2 = supplier2.getProperty("location");
            ok(location2.getProperty("address") === "123 Main St.", "address should have been saved");
        }).fail(testFns.handleFail).fin(start);
    });

    test("validationErrorsChanged event", function () {
        var em = newEm();
        var supplierType = em.metadataStore.getEntityType("Supplier");
        var supplier1 = supplierType.createEntity();
        em.addEntity(supplier1);
        var lastNotification;
        var notificationCount = 0;
        supplier1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            lastNotification = args;
            notificationCount++;
        });
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        supplier1.setProperty("companyName", s);
        ok(lastNotification.added, "last notification should have been 'added'");
        ok(lastNotification.added[0].property.name === "companyName");
        ok(lastNotification.removed[0].property.name === "companyName");
        ok(notificationCount === 1, "should have been 1 notification");
        
        var location = supplier1.getProperty("location");
        location.setProperty("city", s);
        ok(lastNotification.added, "last notification should have been 'added'");
        ok(lastNotification.added[0].propertyName === "location.city", "should have added 'location.city");
        ok(notificationCount === 2, "should have been 2 notifications");
        var errs = supplier1.entityAspect.getValidationErrors();
        ok(errs.length == 2, "should be 2 errors"); // on companyName and city;
        var coErrs = supplier1.entityAspect.getValidationErrors("companyName");
        ok(coErrs.length == 1, "should be 1 company name error");
        var lcErrs = supplier1.entityAspect.getValidationErrors("location.city");
        ok(lcErrs.length == 1, "should be 1 location.city error");

        location.setProperty("city", "much shorter");
        ok(lastNotification.removed, "last notification should have been 'removed'");
        ok(lastNotification.removed[0].propertyName === "location.city", "should have removed 'location.city'");
        ok(notificationCount === 3, "should have been 2 notifications");
        errs = supplier1.entityAspect.getValidationErrors();
        ok(errs.length == 1, "should be 1 error"); // on companyName

    });
    
    test("validate Entity", function () {
        var em = newEm();
        var supplierType = em.metadataStore.getEntityType("Supplier");
        var supplier1 = supplierType.createEntity();
        em.addEntity(supplier1);
        var errs;
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        supplier1.setProperty("companyName", s);
        clearAndRevalidate(supplier1, 1); // companyName
        
        var location = supplier1.getProperty("location");
        location.setProperty("city", s);
        clearAndRevalidate(supplier1, 2); // companyName, city

        location.setProperty("city", "much shorter");
        clearAndRevalidate(supplier1, 1); // companyName

    });
    
    test("validate property", function () {
        var em = newEm();
        var supplierType = em.metadataStore.getEntityType("Supplier");
        var supplier1 = supplierType.createEntity();
        em.attachEntity(supplier1);
        var errs;
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        supplier1.setProperty("companyName", s);
        supplier1.entityAspect.clearValidationErrors();
        supplier1.entityAspect.validateProperty("companyName");
        errs = supplier1.entityAspect.getValidationErrors();
        ok(errs.length == 1, "should be 1 error");
        
        var location = supplier1.getProperty("location");
        location.setProperty("city", s);
        supplier1.entityAspect.clearValidationErrors();
        supplier1.entityAspect.validateProperty("location.city");
        errs = supplier1.entityAspect.getValidationErrors();
        ok(errs.length == 1, "should be 1 error");
        
        supplier1.entityAspect.clearValidationErrors();
        supplier1.entityAspect.validateProperty("location");
        errs = supplier1.entityAspect.getValidationErrors();
        ok(errs.length == 1, "should be 1 error");

        location.setProperty("city", "much shorter");
        supplier1.entityAspect.clearValidationErrors();
        supplier1.entityAspect.validateProperty("location.city");
        errs = supplier1.entityAspect.getValidationErrors();
        ok(errs.length == 0, "should be no errors");

    });
    
    function clearAndRevalidate(entity, count) {
        var errs = entity.entityAspect.getValidationErrors();
        ok(errs.length == count, "should be " + count + " errors"); 
        entity.entityAspect.clearValidationErrors();
        errs = entity.entityAspect.getValidationErrors();
        ok(errs.length == 0, "should be no errors");
        entity.entityAspect.validateEntity();
        errs = entity.entityAspect.getValidationErrors();
        ok(errs.length == count, "should be " + count + " errors");
    }

})(breezeTestFns);
