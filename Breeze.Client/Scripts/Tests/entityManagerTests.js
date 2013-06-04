(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var Enum = core.Enum;
    var Event = core.Event;

    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityKey = breeze.EntityKey;
    var EntityType = breeze.EntityType;
    var EntityState = breeze.EntityState;
    var EntityAction = breeze.EntityAction;
    var QueryOptions = breeze.QueryOptions;
    var SaveOptions = breeze.SaveOptions;
    var ValidationOptions = breeze.ValidationOptions;
    var MergeStrategy = breeze.MergeStrategy;
    var FetchStrategy = breeze.FetchStrategy;

    var newEm = testFns.newEm;

    module("entityManager", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    test("initialization", function () {
        var em = new EntityManager("foo");
        var so = new SaveOptions();
        em.setProperties({
            queryOptions: new QueryOptions(),
            saveOptions: new SaveOptions(),
            validationOptions: new ValidationOptions()
        });
        ok(em);
    });

    test("createEmptyCopy", function() {
        var em = newEm();
        var em2 = em.createEmptyCopy();
        var q = EntityQuery.from("Customers").take(1);
        stop();
        em2.executeQuery(q).then(function(data) {
            ok(data.results.length === 1);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("export/import deleted", function() {

        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        cust1.setProperty("companyName", "Test_js_1");
        cust1.setProperty("city", "Oakland");
        cust1.setProperty("rowVersion", 13);
        cust1.setProperty("fax", "510 999-9999");
        em.addEntity(cust1);
        var cust2 = custType.createEntity();
        cust2.setProperty("companyName", "Test_js_2");
        cust2.setProperty("city", "Oakland");
        cust2.setProperty("rowVersion", 13);
        cust2.setProperty("fax", "510 999-9999");
        em.addEntity(cust2);

        stop();
        em.saveChanges().then(function(sr) {
            var custs = sr.entities;
            ok(custs.length == 2);
            custs[0].entityAspect.setDeleted();
            var newName = testFns.morphString(custs[1].getProperty("companyName"));
            custs[1].setProperty("companyName", newName);
            return em.saveChanges();
        }).then(function(sr) {
            ok(sr.entities.length == 2);
            var exported = em.exportEntities();
            var em2 = newEm();
            em2.importEntities(exported);
        }).fail(function (e) {
            var x = e;
        }).fin(start);


    });

    test("export/import with custom metadata", function () {
        var jsonMetadata = {
            "metadataVersion": "1.0.5",
            "dataServices": [
                {
                    "serviceName": "api/Foo/",
                    "hasServerMetadata": false,
                    "jsonResultsAdapter": "webApi_default",
                    "useJsonp": false
                }
            ],
            "structuralTypes": [
                {
                    "shortName": "address",
                    "namespace": "YourNamespace",
                    "isComplexType": true,
                    "dataProperties": [
                        { "name": "street", "dataType": "String" },
                        { "name": "city", "dataType": "String" },
                        { "name": "country", "dataType": "String" }
                    ]
                },
                {
                    "shortName": "person",
                    "namespace": "YourNamespace",
                    "dataProperties": [
                        { "name": "id", "dataType": "Int32", isPartOfKey: true },
                        { "name": "name", "dataType": "String" },
                        { "name": "hobbies", "dataType": "String" },
                        { "name": "address", "complexTypeName": "address:#YourNamespace" }
                    ]
                }
            ]
        };

        var manager = new breeze.EntityManager();
        manager.metadataStore.importMetadata(jsonMetadata)

        var person = manager.createEntity('person', { id: 1 });
        person.address.street = "Sample Street";

        // console.log("Complex property is a circular datatype, cannot convert to JSON - that's fine")
        // JSON.stringify(person.address); // fails with error

        // console.log("... except that manager.exportEntities() doesn't handle that case!");
        var exportedMs = manager.metadataStore.exportMetadata();
        var exportedEm = manager.exportEntities(); // also fails
        var manager2 = new breeze.EntityManager();
        manager2.importEntities(exportedEm);
        var ents = manager2.getEntities();
        ok(ents.length === 1);
        var samePerson = ents[0];
        ok(samePerson.getProperty("id") === 1, "id should be 1");
        ok(samePerson.entityAspect.getPropertyValue("address.street") === "Sample street", "street names should be the same");
        
    });

    test("export/import complexTypes", function () {
        
        var em = newEm();
        var em2 = newEm();
        var q = EntityQuery.from("Suppliers")
            .where("companyName", "startsWith", "P");
        stop();
        em.executeQuery(q).then(function(data) {

            var suppliers = data.results;
            var suppliersCount = suppliers.length;
            ok(suppliersCount > 0, "should be some suppliers");
            var orderType = em.metadataStore.getEntityType("Order");
            // we want to have our reconsituted em to have different ids than our current em.
            em.keyGenerator.generateTempKeyValue(orderType);
            var empType = em.metadataStore.getEntityType("Employee");
            var custType = em.metadataStore.getEntityType("Customer");
        
            var order1 = em.addEntity(orderType.createEntity());
            ok(!order1.entityAspect.wasLoaded);
            var emp1 = em.addEntity(empType.createEntity());
            ok(!emp1.entityAspect.wasLoaded);
            emp1.setProperty("lastName", "bar");
            var cust1 = em.createEntity("Customer", { companyName: "foo" });
            //var cust1 = em.addEntity(custType.createEntity());
            //cust1.setProperty("companyName", "foo");
            ok(!cust1.entityAspect.wasLoaded);
            order1.setProperty("employee", emp1);
            order1.setProperty("customer", cust1);
            var exportedEm = em.exportEntities();

            em2.importEntities(exportedEm);
            var suppliers = em2.getEntities("Supplier");
            ok(suppliers.length === suppliersCount, "should be same number of suppliers");
            var addedOrders = em2.getChanges(orderType, EntityState.Added);
            ok(addedOrders.length === 1, "should be 1 added order");
            var addedCusts = em2.getChanges(custType, EntityState.Added);
            ok(addedCusts.length === 1, "should be 1 added customer");
            var order1x = addedOrders[0];
            var cust1x = order1x.getProperty("customer");
            ok(cust1x, "should have found a customer");
            ok(cust1x.getProperty("companyName") === "foo", "CompanyName should be 'foo'");
            var emp1x = order1x.getProperty("employee");
            ok(emp1x, "should have found an employee");
            ok(emp1x.getProperty("lastName") === "bar", "LastName should be 'bar'");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("mergeStrategy.overwrite", function () {
        var queryOptions = new QueryOptions({
            mergeStrategy: MergeStrategy.OverwriteChanges,
            fetchStrategy: FetchStrategy.FromServer
        });

        var em = new EntityManager({ serviceName: testFns.serviceName, metadataStore: testFns.metadataStore, queryOptions: queryOptions });
        var q = EntityQuery.from("Customers").take(2).using(em);
        var val = Date.now().toString();
        stop();
        q.execute().then(function (data) {
            var custs = data.results;
            custs[0].setProperty("companyName", val);
            custs[1].setProperty("city", val);
            return q.execute();
        }).then(function (data2) {
            var custs2 = data2.results;
            var companyName = custs2[0].getProperty("companyName");
            var city = custs2[1].getProperty("city");
            ok(companyName != val);
            ok(city != val);
        }).fin(start);
        
        
    });

    test("hasChanges basic", function() {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        
        var saveNeeded = false;
        var count = 0;
        em.hasChangesChanged.subscribe(function (args) {
            count = count + 1;
            saveNeeded = args.saveNeeded;
        });
        ok(count === 0, "count should be 0");
        ok(!em.hasChanges(), "should be no changes");
        var order1 = orderType.createEntity();
        em.attachEntity(order1);
        ok(count === 0, "count should be 0");
        ok(!em.hasChanges(), "should be no changes");
        var order2 = orderType.createEntity();
        em.addEntity(order2);
        ok(count === 1, "count should be 1");
        ok(em.hasChanges(), "should be changes");
    });
    
    test("hasChanges with rejectChanges", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");

        var saveNeeded = false;
        var count = 0;
        em.hasChangesChanged.subscribe(function (args) {
            count = count + 1;
            saveNeeded = args.saveNeeded;
        });
        ok(count === 0, "count should be 0");
        ok(!em.hasChanges(), "should be no changes");
        var order1 = orderType.createEntity();
        em.attachEntity(order1);
        order1.entityAspect.setModified();
        ok(count === 1, "count should be 1");
        ok(em.hasChanges(), "should be no changes");
        var order2 = orderType.createEntity();
        em.addEntity(order2);
        ok(count === 1, "count should be 1");
        ok(em.hasChanges(), "should be changes");
        order1.entityAspect.rejectChanges();
        ok(count === 1, "count should be 1");
        ok(em.hasChanges(), "should be changes");
        order2.entityAspect.rejectChanges();
        ok(count === 2, "count should be 1");
        ok(!em.hasChanges(), "should not be any changes");
    });
    
    test("hasChanges with query mods", function () {
        var em = newEm();

        var hasChanges = false;
        var count = 0;
        em.hasChangesChanged.subscribe(function (args) {
            count = count + 1;
            hasChanges = args.hasChanges;
        });
        ok(count === 0, "count should be 0");
        ok(!em.hasChanges(), "should be no changes");
        stop();
        EntityQuery.from("Customers").take(3).using(em).execute().then(function(data) {
            var custs = data.results;
            custs[0].setProperty("companyName", "xxx");
            custs[1].entityAspect.setDeleted();
            custs[2].entityAspect.setModified();
            ok(count === 1, "count should be 1");
            ok(hasChanges, "should have changes");
            ok(em.hasChanges(), "should be changes");
            em.rejectChanges();
            ok(count === 2, "count should be 2");
            ok(!em.hasChanges(), "should be no changes");
            ok(!hasChanges, " should not have changes");
        }).fail(testFns.handleFail).fin(start);
        
    });
    
    test("initialization error on first query", function () {
        var em = new EntityManager("foo");
        stop();
        em.executeQuery("xxx").then(function(x) {
            ok(false, "shouldn't get here");
        }).fail(function(e) {
            ok(e.message.indexOf("foo") >= 0, "error message should mention 'foo'");
        }).fin(start);
        
    });
    
    test("store-gen keys are always set by key generator on add to manager if they have default values", function () {

        var em = newEm();
        var orderEntityType = em.metadataStore.getEntityType("Order");
        var o1 = orderEntityType.createEntity();
        var tempOrderId = o1.getProperty(testFns.orderKeyName);
        ok(tempOrderId == 0, "should be 0");

        em.addEntity(o1);
        tempOrderId = o1.getProperty(testFns.orderKeyName);
        ok(tempOrderId !== 0, "should not be 0");
        var isTempKey = em.keyGenerator.isTempKey(o1.entityAspect.getKey())
        ok(isTempKey, "should be a tempKey");
        
        stop();
        em.saveChanges().then(function (saveResult) {
            orderId = o1.getProperty(testFns.orderKeyName);
            ok(orderId !== tempOrderId);
            var keyMappings = saveResult.keyMappings;
            ok(keyMappings.length === 1);
            var mapping = keyMappings[0];
            ok(mapping.tempValue === tempOrderId);
            ok(mapping.realValue === orderId);
        }).fail(testFns.handleFail).fin(start);
    });

    test("store-gen keys are not re-set by key generator upon add to manager", function() {

        var dummyOrderID = testFns.wellKnownData.dummyOrderID;
        var em = newEm();
        var orderEntityType = em.metadataStore.getEntityType("Order");
        var o1 = orderEntityType.createEntity();
        o1.setProperty(testFns.orderKeyName, dummyOrderID); // waste of time to set id; it will be replaced.
        var orderId = o1.getProperty(testFns.orderKeyName);
        ok(orderId === dummyOrderID);
        //ok(o1.OrderID() !== 42,
        //    "o1's original key, 42, should have been replaced w/ new temp key.");

        em.addEntity(o1);
        orderId = o1.getProperty(testFns.orderKeyName);
        ok(orderId === dummyOrderID);
        stop();
        em.saveChanges().then(function(saveResult) {
            orderId = o1.getProperty(testFns.orderKeyName);
            ok(orderId !== 42);
            var keyMappings = saveResult.keyMappings;
            ok(keyMappings.length === 1);
            var mapping = keyMappings[0];
            ok(mapping.tempValue === dummyOrderID);
            ok(mapping.realValue === orderId);
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("key generator reset", function () {
        var em = newEm();
        var dummyKeyGenerator = function () {
            this.dummy = true;
        };
        em.setProperties({ keyGeneratorCtor: dummyKeyGenerator });
        ok(em.keyGenerator.dummy === true);


    });
    
    test("import results notification", function () {
        if (testFns.DEBUG_MONGO) {
            ok(true, "NA for Mongo - expand");
            return;
        }
        var em = newEm();
        var em2 = newEm();
        var alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';
        var query = EntityQuery.from("Customers")
            .where(testFns.customerKeyName, "==", alfredsID)
            .expand("orders")
            .using(em);
        stop();
        var exportedEm;
        var exportedCustomer;
        var arrayChangedCount = 0;
        var adds;
        query.execute().then(function (data) {
            var customer = data.results[0];
            exportedCustomer = em.exportEntities([customer]);
            exportedEm = em.exportEntities();
            em2.importEntities(exportedCustomer);
            var sameCustomer = em2.findEntityByKey(customer.entityAspect.getKey());
            var orders = sameCustomer.getProperty("orders");
            ok(orders.length === 0, "orders should be empty to start");
            orders.arrayChanged.subscribe(function (args) {
                arrayChangedCount++;
                adds = args.added;
            });
            em2.importEntities(exportedEm);
            ok(arrayChangedCount == 1, "should only see a single arrayChanged event fired");
            ok(adds && adds.length > 1, "should have been multiple entities shown as added");
        }).fail(testFns.handleFail).fin(start);
    });
    
    test("getChanges", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");
        for (var i = 0; i < 5; i++) {
            em.addEntity(orderType.createEntity()).entityAspect.setUnchanged();
            em.addEntity(empType.createEntity()).entityAspect.setUnchanged();
        }
        for (var i = 0; i < 5; i++) {
            em.addEntity(orderType.createEntity()).entityAspect.setModified();
            em.addEntity(empType.createEntity());
        }
        var c1 = em.getChanges();
        ok(c1.length === 10);
        var c2 = em.getChanges("Order");
        ok(c2.length === 5);
        var c3 = em.getChanges([orderType, custType]);
        ok(c3.length === 5);
        var c4 = em.getChanges([orderType, empType]);
        ok(c4.length === 10);
        var c5 = em.getEntities(["Order"], EntityState.Modified);
        ok(c5.length === 5);
        var c6 = em.getEntities([orderType], EntityState.Added);
        ok(c6.length === 0);
        var c7 = em.getEntities(null, EntityState.Added);
        ok(c7.length === 5);
        var c8 = em.getEntities(null, [EntityState.Added, EntityState.Modified]);
        ok(c8.length === 10);
    });
    
    test("entityChanged event", function() {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");

        var lastArgs, lastAction, lastEntity;
        em.entityChanged.subscribe(function(args) {
            changedArgs.push(args);
            lastArgs = args;
            lastAction = args.entityAction;
            lastEntity = args.entity;
        });
        var order = orderType.createEntity();
        var changedArgs = [];
        em.addEntity(order);
        ok(lastAction === EntityAction.Attach, "lastAction should have been 'Attach'");
        ok(lastEntity === order, "last entity is wrong");

        var emp = empType.createEntity();
        changedArgs = [];
        em.attachEntity(emp);
        ok(lastAction === EntityAction.Attach, "lastAction should have been 'Attach'");
        ok(lastEntity === emp, "last entity is wrong");

        emp.setProperty("lastName", "Smith");
        ok(lastAction === EntityAction.PropertyChange, "lastAction should have been 'Attach'");
        ok(lastEntity === emp, "last entity is wrong");
        ok(lastArgs.args.propertyName === "lastName", "PropertyName is wrong");

        changedArgs = [];
        emp.entityAspect.rejectChanges();
        ok(changedArgs[0].entityAction === EntityAction.EntityStateChange, "should have seen a entityState change");
        ok(changedArgs[1].entityAction === EntityAction.RejectChanges, "lastAction should have been 'RejectChanges'");
        ok(lastEntity === emp, "last entity is wrong");
        
        
        emp.setProperty("lastName", "Jones");
        changedArgs = [];
        emp.entityAspect.acceptChanges();
        ok(changedArgs[0].entityAction === EntityAction.EntityStateChange, "should have seen a entityState change");
        ok(changedArgs[1].entityAction === EntityAction.AcceptChanges, "lastAction should have been 'AcceptChanges'");
        ok(lastEntity === emp, "last entity is wrong");

        em.clear();
        ok(lastAction === EntityAction.Clear, "lastAction should have been 'Clear'");
        ok(lastEntity === undefined, "last entity should be undefined");
    });
    
    

    test("entityChanged event - 2", function() {
        var em = newEm();
        var changedArgs = [];
        var lastArgs, lastAction, lastEntity;
        em.entityChanged.subscribe(function(args) {
            changedArgs.push(args);
            lastArgs = args;
            lastAction = args.entityAction;
            lastEntity = args.entity;
        });
        var q = new EntityQuery()
            .from("Employees")
            .orderBy("lastName")
            .take(2);
        stop();
        em.executeQuery(q).then(function (data) {
            ok(changedArgs.length == 2);
            changedArgs.forEach(function(arg) {
                ok(arg.entityAction === EntityAction.AttachOnQuery, "should have seen an AttachOnQuery"); 
            });
            var emps = data.results;
            ok(emps.length == 2, "results.length should be 2");
            emps[0].setProperty("lastName", "Smith");
            changedArgs = [];
            return em.executeQuery(q);
        }).then(function(data1) {
            ok(data1.results.length == 2, "results.length should be 2");
            // default MergeStrategy is preserveChanges so only unmodified entities should get merged.
            ok(changedArgs.length == 1, "No merge should have occured");
            q = q.using(MergeStrategy.OverwriteChanges);
            changedArgs = [];
            return em.executeQuery(q);
        }).then(function(data2) {
            ok(data2.results.length == 2, "results.length should be 2");
            ok(changedArgs.length == 2);
            changedArgs.forEach(function(arg) {
                ok(arg.entityAction === EntityAction.MergeOnQuery, "all actions should be MergeOnQuery"); 
            });
            start();
        }).fail(testFns.handleFail);
    });
    
    test("entityChanged event suppressed", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");

        var changedArgs = [];
        Event.enable("entityChanged", em, false);
        em.entityChanged.subscribe(function (args) {
            changedArgs.push(args);
        });
        var order = orderType.createEntity();
        em.addEntity(order);
        var emp = empType.createEntity();
        em.attachEntity(emp);
        emp.setProperty("lastName", "Smith");
        emp.entityAspect.rejectChanges();
        emp.setProperty("lastName", "Jones");
        emp.entityAspect.acceptChanges();
        em.clear();
        ok(changedArgs.length === 0, "no change events should have fired");
    });

    test("entityChanged event suppressed by function", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");
        em.tag = "foo";
        var changedArgs = [];
        Event.enable("entityChanged", em, function (em) {
            return em.tag === "enabled";
        });
        em.entityChanged.subscribe(function (args) {
            changedArgs.push(args);
        });
        var order = orderType.createEntity();
        em.addEntity(order);
        var emp = empType.createEntity();
        em.attachEntity(emp);
        emp.setProperty("lastName", "Smith");
        emp.entityAspect.rejectChanges();
        emp.setProperty("lastName", "Jones");
        emp.entityAspect.acceptChanges();
        em.clear();
        ok(changedArgs.length === 0, "no change events should have fired");
    });


    test("wasLoaded", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");
        var order1 = em.attachEntity(orderType.createEntity());
        ok(!order1.entityAspect.wasLoaded);
        var emp1 = em.attachEntity(empType.createEntity());
        ok(!emp1.entityAspect.wasLoaded);
        var q = new EntityQuery().from("Employees").take(2);
        stop();
        em.executeQuery(q, function (data) {
            ok(data.results.length == 2, "results.length should be 2");
            data.results.forEach(function (r) {
                ok(r.entityAspect.wasLoaded === true);
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("persist entityMetadata", function () {
        var em = newEm();
        var ets = em.metadataStore.getEntityTypes();
        var dataServices = em.metadataStore.dataServices;
        var exportedStore = em.metadataStore.exportMetadata();
        var newMs = new MetadataStore();
        newMs.importMetadata(exportedStore);
        var exportedStore2 = newMs.exportMetadata();
        ok(exportedStore.length === exportedStore2.length, "exported lengths should be the same");
        var newEts = newMs.getEntityTypes();
        ok(ets.length == newEts.length);
        for (var i = 0; i < ets.length; i++) {
            var dataServices2 = newMs.dataServices;
            ok(dataServices.length === dataServices2.length, "service names are different");
            var et = ets[i];
            var et2 = newMs.getEntityType(et.name);

            ok(et.name === et2.name, et.name + " :names are different");
            ok(et.dataProperties.length === et2.dataProperties.length, "data properties not the same length");
            core.arrayZip(et.dataProperties, et2.dataProperties, function (dp1, dp2) {
                ok(dp1.name === dp2.name, "dp names are not the same:" + dp1.name + " vs. " + dp2.name);
                ok(dp1.validators.length === dp2.validators.length, "validators length is not the same");
            });
            if (et instanceof EntityType) {
                ok(et.keyProperties.length === et2.keyProperties.length, "key properties not the same length");
                ok(et.navigationProperties.length === et2.navigationProperties.length, "navigation properties not the same length");
                ok(et.defaultResourceName === et2.defaultResourceName, "defaultResource names are different");
                ok(et.autoGeneratedKeyType === et2.autoGeneratedKeyType, "auto generated key types are different");
                ok(et.concurrencyProperties.length === et2.concurrencyProperties.length, "concurrency properties not the same length");
            }
            
            ok(et.unmappedProperties.length === et2.unmappedProperties.length, "unmapped properties not the same length");
            ok(et.validators.length === et2.validators.length);
        }

    });


    test("persist entityManager", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        // we want to have our reconsituted em to have different ids than our current em.
        em.keyGenerator.generateTempKeyValue(orderType);
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");
        var order1 = em.addEntity(orderType.createEntity());
        ok(!order1.entityAspect.wasLoaded);
        var emp1 = em.addEntity(empType.createEntity());
        ok(!emp1.entityAspect.wasLoaded);
        emp1.setProperty("lastName", "bar");
        var cust1 = em.createEntity("Customer", { companyName: "foo" });
        //var cust1 = em.addEntity(custType.createEntity());
        //cust1.setProperty("companyName", "foo");
        ok(!cust1.entityAspect.wasLoaded);
        order1.setProperty("employee", emp1);
        order1.setProperty("customer", cust1);
        var q = new EntityQuery().from("Employees").take(2);
        stop();
        var em2;
        em.executeQuery(q, function(data) {
            ok(data.results.length == 2, "results.length should be 2");
            var exportedEm = em.exportEntities();
            em2 = newEm();
            em2.importEntities(exportedEm);
            var r2 = em2.executeQueryLocally(q);
            ok(r2.length === 2, "should return 2 records");
            var addedOrders = em2.getChanges(orderType, EntityState.Added);
            ok(addedOrders.length === 1, "should be 1 added order");
            var addedCusts = em2.getChanges(custType, EntityState.Added);
            ok(addedCusts.length === 1, "should be 1 added customer");
            var order1x = addedOrders[0];
            var cust1x = order1x.getProperty("customer");
            ok(cust1x, "should have found a customer");
            ok(cust1x.getProperty("companyName") === "foo", "CompanyName should be 'foo'");
            var emp1x = order1x.getProperty("employee");
            ok(emp1x, "should have found an employee");
            ok(emp1x.getProperty("lastName") === "bar", "LastName should be 'bar'");
        }).fail(testFns.handleFail).fin(start);
    });
    
   test("persist entityManager partial", function () {
        var em = newEm();
        var orderType = em.metadataStore.getEntityType("Order");
        // we want to have our reconsituted em to have different ids than our current em.
        em.keyGenerator.generateTempKeyValue(orderType);
        var empType = em.metadataStore.getEntityType("Employee");
        var custType = em.metadataStore.getEntityType("Customer");
        var order1 = em.addEntity(orderType.createEntity());
        ok(!order1.entityAspect.wasLoaded);
        var emp1 = em.addEntity(empType.createEntity());
        ok(!emp1.entityAspect.wasLoaded);
        emp1.setProperty("lastName", "bar");
        var cust1 = em.addEntity(custType.createEntity());
        cust1.setProperty("companyName", "foo");
        ok(!cust1.entityAspect.wasLoaded);
        // order1.setProperty("Employee", emp1);
        order1.setProperty("customer", cust1);
        var q = new EntityQuery().from("Customers").take(2);
        stop();
        var em2;
       em.executeQuery(q, function(data) {
           ok(data.results.length == 2, "results.length should be 2");
           var cust2 = data.results[0];
           var exportedEm = em.exportEntities([order1, cust1, cust2]);
           em2 = newEm();
           em2.importEntities(exportedEm);
           var r2 = em2.executeQueryLocally(q);
           ok(r2.length === 2, "should return 2 records");
           var addedOrders = em2.getChanges(orderType, EntityState.Added);
           ok(addedOrders.length === 1, "should be 1 added order");
           var addedCusts = em2.getChanges(custType, EntityState.Added);
           ok(addedCusts.length === 1, "should be 1 added customer");
           var order1x = addedOrders[0];
           var cust1x = order1x.getProperty("customer");
           ok(cust1x, "should have found a customer");
           ok(cust1x.getProperty("companyName") === "foo", "CompanyName should be 'foo'");
       }).fail(testFns.handleFail).fin(start);
   });
    
   test("importEntities  can safely merge and preserve or overwrite pending changes", 4, function () {
           // D#2207
           var em1 = newEm();
           var customerType = em1.metadataStore
               .getEntityType("Customer");

           var cust1 = customerType.createEntity();
           var cust1Id = core.getUuid();
           cust1.setProperty(testFns.customerKeyName, cust1Id);
           cust1.setProperty("companyName","Foo");
           em1.attachEntity(cust1);

           var exports = em1.exportEntities();

           // As if em2 queried for same customer
           var em2 = newEm();
           var cust1b = customerType.createEntity();
           cust1b.setProperty(testFns.customerKeyName, cust1Id);
           cust1b.setProperty("companyName","Foo");
           em2.attachEntity(cust1b);

           // then the user changed it but hasn't saved.
           var changedName = "Changed name";
           cust1b.setProperty("companyName", changedName);

           // Import from em1
           em2.importEntities(exports);

           ok(cust1b.entityAspect.entityState.isModified(),
               "cust1b should still be in Modified state after import");

           // Fails: D#2207
           equal(cust1b.getProperty("companyName"), changedName, 
               core.formatString("should retain pending cust name change, '%1'", changedName));

       
           em2.importEntities(exports, 
             { mergeStrategy: MergeStrategy.OverwriteChanges });
       
           ok(cust1b.entityAspect.entityState.isUnchanged(),
                   "cust1b should be in Unchanged state after import");

        
           notEqual(cust1b.getProperty("companyName"), changedName,
               "customer should not retain pending name change");
               
    });

    test("Export changes to local storage and re-import", 5, function () {

        var em = newEm();

         // add a new Cust to the cache
         var newCust = em.addEntity(createCust(em, "Export/import safely #1"));
         // add some more
         em.addEntity(createCust(em, "Export/import safely #2"));
         em.addEntity(createCust(em, "Export/import safely #3"));

         var changes = em.getChanges();
         var changesExport = em.exportEntities(changes);

         ok(window.localStorage, "this browser supports local storage");

         var stashName = "stash_newTodos";
         window.localStorage.setItem(stashName, changesExport);

         em.clear();
         ok(em.getEntities().length === 0,
             "em should be empty after clearing it");

         var changesImport = window.localStorage.getItem(stashName);
         em.importEntities(changesImport);

         var entitiesInCache = em.getEntities();
         var restoreCount = entitiesInCache.length;
         equal(restoreCount, 3, "restored 3 new Custs from file");

         var restoredCust = entitiesInCache[0];
         var restoredState = restoredCust.entityAspect.entityState;

         ok(restoredState.isAdded(),
              core.formatString("State of restored first Cust %1 is %2", restoredCust.getProperty("companyName"), restoredState));

         ok(newCust !== restoredCust,
             "Restored Cust is not the same object as the original Cust");
    });

    function createCust(em, companyName) {
        var custType = em.metadataStore.getEntityType("Customer");
        var cust = custType.createEntity();
        cust.setProperty("companyName", companyName);
        return cust;
    }

    // Uncomment when doing FULL testing
//    test("persist entityManager - large data", function () {
//        var em1 = newEm();
//        var q = new EntityQuery().from("CustomersAndOrders");
//        stop();
//        em1.executeQuery(q).then(function (data) {
//            var entities1 = em1.getEntities();
//            var exportedMs = em1.metadataStore.exportMetadata();
//            var exportedEm = em1.exportEntities();
//            ok(exportedEm.length > 200000, "exported size is too small");
//            var em2 = EntityManager.importEntities(exportedEm);
//            var entities2 = em2.getEntities();

//            ok(entities1.length == entities2.length, "lengths should be the same");
//            var exportedMs2 = em2.metadataStore.exportMetadata();
//            var exportedEm2 = em2.exportEntities();
//            ok(exportedMs.length === exportedMs2.length, "exported metadata sizes should be the same: " + exportedMs.length + " vs " + exportedMs2.length);
//            ok(exportedEm.length === exportedEm2.length, "exported entity manager sizes should be the same: " + exportedEm.length + " vs " + exportedEm2.length);
//            start();
//        }).fail(testFns.handleFail);
//    });

})(breezeTestFns);