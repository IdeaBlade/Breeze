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
    var EntityAction = entityModel.EntityAction;
    var QueryOptions = entityModel.QueryOptions;
    var SaveOptions = entityModel.SaveOptions;
    var ValidationOptions = entityModel.ValidationOptions;
    var MergeStrategy = entityModel.MergeStrategy;

    var metadataStore = new MetadataStore();

    var newEm = function () {
        return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: metadataStore });
    };

    module("entityManager", {
        setup: function () {
            if (!metadataStore.isEmpty()) return;
            stop();
            var em = newEm();
            em.fetchMetadata(function (rawMetadata) {
                var isEmptyMetadata = metadataStore.isEmpty();
                ok(!isEmptyMetadata);
                start();
            }).fail(testFns.handleFail);
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

    test("getChanges", function () {
        var em = newEm();
        var orderType = metadataStore.getEntityType("Order");
        var empType = metadataStore.getEntityType("Employee");
        var custType = metadataStore.getEntityType("Customer");
        for (var i = 0; i < 5; i++) {
            em.attachEntity(orderType.createEntity());
            em.attachEntity(empType.createEntity());
        }
        for (var i = 0; i < 5; i++) {
            em.attachEntity(orderType.createEntity()).entityAspect.setModified();
            em.addEntity(empType.createEntity());
        }
        var c1 = em.getChanges();
        ok(c1.length === 10);
        var c2 = em.getChanges(orderType);
        ok(c2.length === 5);
        var c3 = em.getChanges([orderType, custType]);
        ok(c3.length === 5);
        var c4 = em.getChanges([orderType, empType]);
        ok(c4.length === 10);
        var c5 = em.getEntities([orderType], EntityState.Modified);
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
        var orderType = metadataStore.getEntityType("Order");
        var empType = metadataStore.getEntityType("Employee");
        var custType = metadataStore.getEntityType("Customer");

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

        emp.setProperty("LastName", "Smith");
        ok(lastAction === EntityAction.PropertyChange, "lastAction should have been 'Attach'");
        ok(lastEntity === emp, "last entity is wrong");
        ok(lastArgs.args.propertyName === "LastName", "PropertyName is wrong");

        changedArgs = [];
        emp.entityAspect.rejectChanges();
        ok(changedArgs[0].entityAction === EntityAction.PropertyChange, "should have seen a property change");
        ok(changedArgs[0].args.propertyName === "LastName", "PropertyName is wrong");
        ok(changedArgs[1].entityAction === EntityAction.EntityStateChange, "should have seen a entityState change");
        ok(changedArgs[2].entityAction === EntityAction.RejectChanges, "lastAction should have been 'RejectChanges'");
        ok(lastEntity === emp, "last entity is wrong");
        
        
        emp.setProperty("LastName", "Jones");
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
            .orderBy("LastName")
            .take(2);
        stop();
        em.executeQuery(q).then(function (data) {
            ok(changedArgs.length == 2);
            changedArgs.forEach(function(arg) {
                ok(arg.entityAction === EntityAction.AttachOnQuery, "should have seen an AttachOnQuery"); 
            });
            var emps = data.results;
            ok(emps.length == 2, "results.length should be 2");
            emps[0].setProperty("LastName", "Smith");
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
            ok(changedArgs.length == 3);
            ok(changedArgs[0].entityAction === EntityAction.PropertyChange, "first action should be a PropertyChange");
            changedArgs.slice(1).forEach(function(arg) {
                ok(arg.entityAction === EntityAction.MergeOnQuery, "all other actions should be MergeOnQuery"); 
            });
            start();
        }).fail(testFns.handleFail);
    });

    test("wasLoaded", function () {
        var em = newEm();
        var orderType = metadataStore.getEntityType("Order");
        var empType = metadataStore.getEntityType("Employee");
        var custType = metadataStore.getEntityType("Customer");
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
        var ets = metadataStore.getEntityTypes();
        var snames = metadataStore.serviceNames;
        var exportedStore = metadataStore.export();
        var newMs = new MetadataStore();
        newMs.import(exportedStore);
        var exportedStore2 = newMs.export();
        ok(exportedStore.length === exportedStore2.length, "exported lengths should be the same");
        var newEts = newMs.getEntityTypes();
        ok(ets.length == newEts.length);
        for (var i = 0; i < ets.length; i++) {
            var snames2 = newMs.serviceNames;
            ok(snames.length === snames2.length, "service names are different");
            var et = ets[i];
            var et2 = newMs.getEntityType(et.name);

            ok(et.name === et2.name, et.name + " :names are different");
            ok(et.dataProperties.length === et2.dataProperties.length, "data properties not the same length");
            core.arrayZip(et.dataProperties, et2.dataProperties, function (dp1, dp2) {
                ok(dp1.name === dp2.name, "dp names are not the same:" + dp1.name + " vs. " + dp2.name);
                ok(dp1.validators.length === dp2.validators.length, "validators length is not the same");
            });
            ok(et.navigationProperties.length === et2.navigationProperties.length, "navigation properties not the same length");
            ok(et.keyProperties.length === et2.keyProperties.length, "key properties not the same length");
            ok(et.concurrencyProperties.length === et2.concurrencyProperties.length, "concurrency properties not the same length");
            ok(et.unmappedProperties.length === et2.unmappedProperties.length, "unmapped properties not the same length");
            ok(et.defaultResourceName === et2.defaultResourceName, "defaultResource names are different");
            ok(et.autoGeneratedKeyType === et2.autoGeneratedKeyType, "auto generated key types are different");
            ok(et.validators.length === et2.validators.length);
        }

    });


    test("persist entityManager", function () {
        var em = newEm();
        var orderType = metadataStore.getEntityType("Order");
        // we want to have our reconsituted em to have different ids than our current em.
        em.keyGenerator.generateTempKeyValue(orderType);
        var empType = metadataStore.getEntityType("Employee");
        var custType = metadataStore.getEntityType("Customer");
        var order1 = em.addEntity(orderType.createEntity());
        ok(!order1.entityAspect.wasLoaded);
        var emp1 = em.addEntity(empType.createEntity());
        ok(!emp1.entityAspect.wasLoaded);
        emp1.setProperty("LastName", "bar");
        var cust1 = em.addEntity(custType.createEntity());
        cust1.setProperty("CompanyName", "foo");
        ok(!cust1.entityAspect.wasLoaded);
        order1.setProperty("Employee", emp1);
        order1.setProperty("Customer", cust1);
        var q = new EntityQuery().from("Employees").take(2);
        stop();
        var em2;
        em.executeQuery(q, function (data) {
            ok(data.results.length == 2, "results.length should be 2");
            var exportedEm = em.export();
            em2 = new EntityManager();
            em2.import(exportedEm);
            var r2 = em2.executeQueryLocally(q);
            ok(r2.length === 2, "should return 2 records");
            var addedOrders = em2.getChanges(orderType, EntityState.Added);
            ok(addedOrders.length === 1, "should be 1 added order");
            var addedCusts = em2.getChanges(custType, EntityState.Added);
            ok(addedCusts.length === 1, "should be 1 added customer");
            var order1x = addedOrders[0];
            var cust1x = order1x.getProperty("Customer");
            ok(cust1x, "should have found a customer");
            ok(cust1x.getProperty("CompanyName") === "foo", "CompanyName should be 'foo'");
            var emp1x = order1x.getProperty("Employee");
            ok(emp1x, "should have found an employee");
            ok(emp1x.getProperty("LastName") === "bar", "LastName should be 'bar'");
        }).then(function (data3) {
            start();
        }).fail(testFns.handleFail);
    });
    
   test("persist entityManager partial", function () {
        var em = newEm();
        var orderType = metadataStore.getEntityType("Order");
        // we want to have our reconsituted em to have different ids than our current em.
        em.keyGenerator.generateTempKeyValue(orderType);
        var empType = metadataStore.getEntityType("Employee");
        var custType = metadataStore.getEntityType("Customer");
        var order1 = em.addEntity(orderType.createEntity());
        ok(!order1.entityAspect.wasLoaded);
        var emp1 = em.addEntity(empType.createEntity());
        ok(!emp1.entityAspect.wasLoaded);
        emp1.setProperty("LastName", "bar");
        var cust1 = em.addEntity(custType.createEntity());
        cust1.setProperty("CompanyName", "foo");
        ok(!cust1.entityAspect.wasLoaded);
        // order1.setProperty("Employee", emp1);
        order1.setProperty("Customer", cust1);
        var q = new EntityQuery().from("Customers").take(2);
        stop();
        var em2;
        em.executeQuery(q, function (data) {
            ok(data.results.length == 2, "results.length should be 2");
            var cust2 = data.results[0];
            var exportedEm = em.export([order1, cust1, cust2]);
            em2 = new EntityManager();
            em2.import(exportedEm);
            var r2 = em2.executeQueryLocally(q);
            ok(r2.length === 2, "should return 2 records");
            var addedOrders = em2.getChanges(orderType, EntityState.Added);
            ok(addedOrders.length === 1, "should be 1 added order");
            var addedCusts = em2.getChanges(custType, EntityState.Added);
            ok(addedCusts.length === 1, "should be 1 added customer");
            var order1x = addedOrders[0];
            var cust1x = order1x.getProperty("Customer");
            ok(cust1x, "should have found a customer");
            ok(cust1x.getProperty("CompanyName") === "foo", "CompanyName should be 'foo'");
        }).then(function (data3) {
            start();
        }).fail(testFns.handleFail);
    });

    // Uncomment when doing FULL testing
//    test("persist entityManager - large data", function () {
//        var em1 = newEm();
//        var q = new EntityQuery().from("CustomersAndOrders");
//        stop();
//        em1.executeQuery(q).then(function (data) {
//            var entities1 = em1.getEntities();
//            var exportedMs = em1.metadataStore.export();
//            var exportedEm = em1.export();
//            ok(exportedEm.length > 200000, "exported size is too small");
//            var em2 = EntityManager.import(exportedEm);
//            var entities2 = em2.getEntities();

//            ok(entities1.length == entities2.length, "lengths should be the same");
//            var exportedMs2 = em2.metadataStore.export();
//            var exportedEm2 = em2.export();
//            ok(exportedMs.length === exportedMs2.length, "exported metadata sizes should be the same: " + exportedMs.length + " vs " + exportedMs2.length);
//            ok(exportedEm.length === exportedEm2.length, "exported entity manager sizes should be the same: " + exportedEm.length + " vs " + exportedEm2.length);
//            start();
//        }).fail(testFns.handleFail);
//    });

    return testFns;
});