// ReSharper disable InconsistentNaming
define(["testFns", "testNorthwindData"], function (testFns, testData) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var EntityQuery = breeze.EntityQuery;       
    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("exportImportTests", testFns.getModuleOptions(newEm));
   
    /*********************************************************
    * Confirm browser supports local storage
    * else many tests will fail
    *********************************************************/
    test("browser supports local storage", 1, function () {
        ok(window.localStorage, "should support local storage");
    });
    
    /*********************************************************
    * can stash entire contents of cache locally
    *********************************************************/
    test("stash entire cache locally and restore", 1, function() {
        var em1 = newEm();
        var expected = testData.primeTheCache(em1);
        var exportData = em1.exportEntities();

        var stashName = "stash_everything";
        window.localStorage.setItem(stashName, exportData);
        
        var em2 = newEm();
        var importData = window.localStorage.getItem(stashName);
        em2.importEntities(importData);

        var entitiesInCache = em2.getEntities();
        var restoreCount = entitiesInCache.length;
        equal(restoreCount, expected.entityCount,
            "should have restored expected number of all entities");
    });
    
    /*********************************************************
    * can stash changes locally and restore
    *********************************************************/
    test("stash changes locally and restore", 5, function () {

        var em1 = newEm();
        var expected = testData.primeTheCache(em1);

        var changes = em1.getChanges();
        var exportData = em1.exportEntities(changes);
        
        var stashName = "stash_changes";
        window.localStorage.setItem(stashName, exportData);

        var em2 = newEm();

        var importData = window.localStorage.getItem(stashName);
        em2.importEntities(importData);

        var entitiesInCache = em2.getEntities();
        var restoreCount = entitiesInCache.length;
        
        equal(restoreCount, expected.changedCount,
            "should have restored expected number of changed entities");

        var restoredOrder = em2.getEntities(expected.orderType)[0];
        var orderState = restoredOrder.entityAspect.entityState;
        ok(orderState.isAdded(),
             "restored order entitystate is " + orderState);

        var restoredCust = restoredOrder.Customer(); // by navigation
        ok(restoredCust !== null,
             "Got Customer of restored Order '{0}' by navigation"
                 .format(restoredCust.CompanyName()));
        var restoredCustName = restoredCust.CompanyName();
        var newCustName = expected.newCust.CompanyName();
        equal(restoredCustName, newCustName,
             "restoredNewCust's name should == newCust's name");
        
        var restoredCustID = restoredCust.CustomerID();
        var newCustID = expected.newCust.CustomerID();
        notEqual(restoredCustID, newCustID,
             "restoredNewCust ID should not equal newCust's ID " +
             "because the imported newCust gets a new temp key");
    });
    /*********************************************************
     * cannot attach an entity from another manager
     *********************************************************/
    test("cannot attach an entity from another manager", 1,
        function () {
            var em1 = newEm();
            var expected = testData.primeTheCache(em1);
            var em2 = newEm();
            raises(function() {
                em2.attachEntity(expected.unchangedCust);
            }, "should throw if attach entity from another manager");            
    });
    /*********************************************************
    * can copy unchanged to another manager with export/import
    * use export/import to copy entities between managers
    *********************************************************/
    test("can copy unchanged to another manager w/export/import", 1,
        function () {
        var em1 = newEm();
        var expected = testData.primeTheCache(em1);
        var exportData = em1.exportEntities(expected.unchanged);

        var em2 = newEm();
        em2.importEntities(exportData);
        
        var entitiesInCache = em2.getEntities();
        var copyCount = entitiesInCache.length;
        equal(copyCount, expected.unchangedCount,
            "should have restored expected number of unchanged entities");
    });
    
    /*********************************************************
    * import merge overwrites if entity in cache is unchanged
    *********************************************************/
    test("import merge overwrites if entity in cache is unchanged", 3, 
        function () {
            var em1 = newEm();
            var customerType = em1.metadataStore
                .getEntityType("Customer");

            var cust1 = customerType.createEntity();
            var cust1Id = breeze.core.getUuid();
            cust1.CustomerID(cust1Id);
            cust1.CompanyName("Foo");
            em1.attachEntity(cust1);

            // cust1's name is "Foo" in em1
            var exportData = em1.exportEntities();

            // Suppose em2 queried for same customer 
            // much earlier when it had the name "Bar"
            var em2 = newEm();
            var cust1b = customerType.createEntity();
            cust1b.CustomerID(cust1Id);
            cust1b.CompanyName("Bar");
            em2.attachEntity(cust1b);

            equal(cust1b.CompanyName(), "Bar",
                "should have cust name, Bar, before import");
            
            // Import from em1
            em2.importEntities(exportData);

            ok(cust1b.entityAspect.entityState.isUnchanged(),
                "cust should still be unchanged after import.");
            
            equal(cust1b.CompanyName(), "Foo",
                "should have import cust name, Foo");

    });
    /*********************************************************
    * can query locally for entities to export to another manager
    *********************************************************/
    test("can query entities to export to another manager", 1,
        function () {
            var em1 = newEm();
            testData.primeTheCache(em1);

            var selectedCusts = EntityQuery.from("Customers")
                .where("CompanyName", "startsWith", "Customer")
                .using(em1)
                .executeLocally();
            var selectedCustsCount = selectedCusts.length;

            var exportData = em1.exportEntities(selectedCusts);

            var em2 = newEm();
            em2.importEntities(exportData);

            var entitiesInCache = em2.getEntities();
            var copyCount = entitiesInCache.length;
            equal(copyCount, selectedCustsCount,
                "should have imported {0} queried entities"
                .format(selectedCustsCount));
        });
    /*********************************************************
    * temporary keys change after importing
    *********************************************************/
    test("temporary keys change after importing", 2, function () {
        var em1 = newEm();
        var newCust1a = testData.createCustomer(em1);
        em1.addEntity(newCust1a);

        var em2 = newEm();
        var exportData = em1.exportEntities([newCust1a]);

        em2.importEntities(exportData);
        var newCust1b = em2.getChanges()[0];

        equal(newCust1a.CompanyName(), newCust1b.CompanyName(),
            "newCust1a's name should match newCust1b's name.");

        notEqual(newCust1a.CustomerID(), newCust1b.CustomerID(),
             "newCust1a's ID should not equal newCust1b's ID because " +
             "the imported new entity gets a new temp key");
    });

    /*********************************************************
    * can safely merge and preserve pending changes
    *********************************************************/
    test("can safely merge and preserve pending changes", 2,
        function () {
        var em1 = newEm();
        var customerType = em1.metadataStore
            .getEntityType("Customer");

        var cust1 = customerType.createEntity();
        var cust1Id = breeze.core.getUuid();
        cust1.CustomerID(cust1Id);
        cust1.CompanyName("Foo");
        em1.attachEntity(cust1);

        var exportData = em1.exportEntities();

        // As if em2 queried for same customer
        var em2 = newEm();
        var cust1b = customerType.createEntity();
        cust1b.CustomerID(cust1Id);
        cust1b.CompanyName("Foo");
        em2.attachEntity(cust1b);

        // then the user changed it but hasn't saved.
        var changedName = "Changed name";
        cust1b.CompanyName(changedName);

        // Import from em1; preserves changes by default
        em2.importEntities(exportData);

        ok(cust1b.entityAspect.entityState.isModified(),
            "cust1b should still be in Modified state after import");

        // Fails: D#2207
        equal(cust1b.CompanyName(), changedName,
            "should retain pending cust name change, '{0}'" .format(changedName));

    });

});