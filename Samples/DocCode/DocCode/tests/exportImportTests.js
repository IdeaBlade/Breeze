// ReSharper disable InconsistentNaming
(function (testFns, testData) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var EntityQuery = breeze.EntityQuery;
    var EntityManager = breeze.EntityManager;
    var EntityState = breeze.EntityState;
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
        
        var importData = window.localStorage.getItem(stashName);
        var em2 = new EntityManager(); // virginal
        em2.importEntities(importData);

        var entitiesInCache = em2.getEntities();
        var restoreCount = entitiesInCache.length;
        equal(restoreCount, expected.entityCount,
            "should have restored expected number of all entities");
    });
    /*********************************************************
    * can navigate from restored child to its parent
    *********************************************************/
    test("can navigate from restored child to its parent", 1, function () {
        var em1 = newEm();
        var expected = testData.primeTheCache(em1);
        var exportData = em1.exportEntities();

        var stashName = "stash_everything";
        window.localStorage.setItem(stashName, exportData);

        var importData = window.localStorage.getItem(stashName);
        var em2 = new EntityManager(); // virginal        
        em2.importEntities(importData);

        var restoredOrder = em2.getEntities(expected.orderType)[0];
        var restoredCust = restoredOrder.Customer();
        if (restoredCust) {
            var restoredCustName = restoredCust.CompanyName();
            ok(true,
                "Got Customer of restored Order '{0}' by navigation"
                    .format(restoredCustName));
        } else {
            ok(false, "should have navigated to parent Customer of restored Order");
        }
    });
    /*********************************************************
    * can stash changes locally and restore
    *********************************************************/
    test("stash changes locally and restore", 4, function () {

        var em1 = newEm();
        var expected = testData.primeTheCache(em1);

        var changes = em1.getChanges();
        var exportData = em1.exportEntities(changes);
        
        var stashName = "stash_changes";
        window.localStorage.setItem(stashName, exportData);

        var importData = window.localStorage.getItem(stashName);
        var em2 = new EntityManager(); // virginal        
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
        if (restoredCust) {
            var restoredCustName = restoredCust.CompanyName();
            ok(true,
                "Got Customer of restored Order '{0}' by navigation"
                    .format(restoredCustName));
            var newCustName = expected.newCust.CompanyName();
            equal(restoredCustName, newCustName,
                "restoredNewCust's name should == newCust's name");
        } else {
            ok(false, "should have navigated to parent Customer of restored Order");
        }
    });
    /*********************************************************
     * cannot attach an entity from another manager
     *********************************************************/
    test("cannot attach an entity from another manager", 1, function () {
        var em1 = newEm();
        var expected = testData.primeTheCache(em1);
        
        var errRegEx = /belongs to another EntityManager/i;
        var expectedErrMsg = 
            "should have thrown error matching '{0}'"
            .format(errRegEx.toString());
        try {
            var em2 = newEm(); //new manager, prepared w/ existing metadata            
            em2.attachEntity(expected.unchangedCust);
            ok(false, expectedErrMsg);
        } catch (err) {
            ok(errRegEx.test(err.message), expectedErrMsg);
        }
        // The following works but is less informative
        //raises(
        //    function () {
        //        em2.attachEntity(expected.unchangedCust);
        //    },
        //    /belongs to anotherx EntityManager/i,
        //    "should throw expected error if attach entity from another manager");
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

        var em2 = new EntityManager(); //virginal
        em2.importEntities(exportData);
        
        var entitiesInCache = em2.getEntities();
        var copyCount = entitiesInCache.length;
        equal(copyCount, expected.unchangedCount,
            "should have restored expected number of unchanged entities");
    });
    /*********************************************************
   * import of changed entity into empty cache preserves originalValues 
   * and therefore can reject changes to restore its original state
   * Failed in v.1.4.6 as reported in defect #2561. Fixed.
   *********************************************************/
    test("import of changed entity into empty cache preserves originalValues", 3,
        function () {
            var em = newEm();
            var custId = breeze.core.getUuid();

            // Suppose we are editing a customer
            var cust = em.createEntity("Customer", {
                CustomerID: custId,
                CompanyName: "Foo",
            }, EntityState.Unchanged);

            // We change his CompanyName
            cust.CompanyName("Bar");
            
            // We export and stash these changes offline
            // because we are not ready to save them
            // (in the test we just export)
            var exportData = em.exportEntities();
            
            var originalCompanyName = cust.entityAspect.originalValues['CompanyName'];
            var isDefined = originalCompanyName !== undefined;

            ok(isDefined,
                "originalValues['CompanyName'] should be defined before export, it is '{0}'"
                .format(isDefined ? originalCompanyName : 'undefined'));

            // We re-run the app later with a clean manager
            em.clear();
            var imported = em.importEntities(exportData).entities;
            cust = imported[0];
            
            // Now show that we import the originalValues as well 
            originalCompanyName = cust.entityAspect.originalValues['CompanyName'];
            isDefined = originalCompanyName !== undefined;

            ok(isDefined,
                "originalValues['CompanyName'] should be defined after import, it is '{0}'"
                .format(isDefined ? originalCompanyName : 'undefined'));           

            cust.entityAspect.rejectChanges(); // revert it

            equal(cust.CompanyName(), "Foo",
               "should have original CompanyName, Foo, after reverting ");
    });
    
    /*********************************************************
    * import merge overwrites cached entity if cached entity is unchanged 
    * Failing asserts #6 and #8 in Breeze v.1.4.6 per Defect #2560. Fixed
    *********************************************************/
    test("import merge overwrites cached entity if cached entity is unchanged ", 8,
        function () {

            var em = newEm();
            var custId = breeze.core.getUuid();
            
            // Suppose we are editing a customer
            var cust = em.createEntity("Customer", {
                CustomerID: custId,
                CompanyName: "Foo",
                ContactName: "Baz"
            }, EntityState.Unchanged);
 
            // We change his CompanyName
            cust.CompanyName("Bar");
            
            // We export and stash these changes offline
            // because we are not ready to save them
            // (in the test we just export)
            var exportData = em.exportEntities();
            
            // We re-run the app later ...
            em.clear();
            
            // ... and query for the same customer 
            // He has his prechange CompanyName, "Bar",
            // but for some reason does not have a ContactName;
            // Perhaps a different user changed it.
            // (simulate query by creating in unmodified state)
            cust = em.createEntity("Customer", {
                CustomerID: custId,
                CompanyName: "Foo"
                // No ContactName !! 
            }, EntityState.Unchanged);

            equal(cust.CompanyName(), "Foo",
                "should have CompanyName, Foo, before import");
            equal(cust.ContactName(), null,
                "should NOT have a ContactName before import");
            
            em.importEntities(exportData);

            ok(cust.entityAspect.entityState.isModified(),
                "cust should be modified after import.");
            
            equal(cust.CompanyName(), "Bar",
                "should have changed CompanyName, Bar, after import");
            equal(cust.ContactName(), "Baz",
                "should have unchanged ContactName, Baz, after import");

            var originalContactName = cust.entityAspect.originalValues['ContactName'];
            var isUndefined = originalContactName === undefined;
 
            ok(isUndefined,
                "originalValues['ContactName'] should be undefined, it is '{0}'"
                .format(isUndefined ? 'undefined' : originalContactName));
            
            // Now show that we import the originalValues as well
            // and do not create new ones.
            cust.entityAspect.rejectChanges(); // revert it
            
            equal(cust.CompanyName(), "Foo",
               "should have original CompanyName, Foo, after reverting ");
            equal(cust.ContactName(), "Baz",
               "should STILL have import ContactName, Baz, after reverting");

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
            
            var em2 = new EntityManager(); // virginal
            em2.importEntities(exportData);

            var entitiesInCache = em2.getEntities();
            var copyCount = entitiesInCache.length;
            equal(copyCount, selectedCustsCount,
                "should have imported {0} queried entities"
                .format(selectedCustsCount));
        });

    /*********************************************************
    * can safely merge and preserve pending changes
    *********************************************************/
    test("can safely merge and preserve pending changes", 2,
        function () {
        // both manager's prepared w/ existing metadata
        var em1 = newEm();
        var em2 = newEm();

        var cust1Id = breeze.core.getUuid();
        var cust1a = em1.createEntity("Customer", {
            CustomerID: cust1Id,
            CompanyName: "Foo"
        }, EntityState.Unchanged);

        // As if em2 queried for same customer           
        var cust1b = em2.createEntity("Customer", {
            CustomerID: cust1Id,
            CompanyName: "Foo"
        }, EntityState.Unchanged);

        // then the user changed it but hasn't saved.
        var changedName = "Changed name";
        cust1b.CompanyName(changedName);

        // Import from em1; preserves changes by default
        var exportData = em1.exportEntities();
        em2.importEntities(exportData);

        ok(cust1b.entityAspect.entityState.isModified(),
            "cust1b should still be in Modified state after import");

        equal(cust1b.CompanyName(), changedName,
            "should retain pending cust name change, '{0}'" .format(changedName));

    });

})(docCode.testFns, docCode.northwindTestData);