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
    var moduleMetadataStore = null;

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
    * can export locally queried entities from one manager
    *********************************************************/
    test("can export locally queried entities from one manager", 2,
        function () {
            var em1 = newEm();
            testData.primeTheCache(em1);

            var selectedCusts = EntityQuery.from("Customers")
                .where("CompanyName", "startsWith", "Customer")
                .using(em1)
                .executeLocally();
            var selectedCustsCount = selectedCusts.length;

            var exportData = em1.exportEntities(selectedCusts);
            ok(true, "length of the serialized export is " + exportData.length);
            
            var em2 = new EntityManager(); // virginal
            em2.importEntities(exportData);

            var entitiesInCache = em2.getEntities();
            var copyCount = entitiesInCache.length;
            equal(copyCount, selectedCustsCount,
                "should have imported {0} queried entities"
                .format(selectedCustsCount));
        });
    
    /*********************************************************
    * can import entities from one manager to another w/o metadata
    * when both managers are preconditioned with metadata
    *********************************************************/
    test("can export locally queried entities from one manager to another w/o metadata", 2,
        function () {
            var em1 = newEm();
            testData.primeTheCache(em1);

            var selectedCusts = EntityQuery.from("Customers")
                .where("CompanyName", "startsWith", "Customer")
                .using(em1)
                .executeLocally();
            var selectedCustsCount = selectedCusts.length;

            // Export without metadata!
            var exportData = em1.exportEntities(selectedCusts, false);
            ok(true, "length of the serialized export is " + exportData.length);

            // a virginal manager would throw exception on import
            // because it lacks the metadata
            // var em2 = new EntityManager(); 
            
            // create em2 as an "empty copy" instead
            // an "empty copy" has everything from the source manager
            // except its entity cache.
            var em2 = em1.createEmptyCopy();
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
    
    /*********************************************************
    * Temporary key values may not be preserved upon import
    *********************************************************/
    test("temporary key values may not be preserved upon import",
        function () {
            resetTempKeyGeneratorSeed();
            var em1 = newEm();
            
            // Create a new Order. The Order key is store-generated.
            // Until saved, the new Order has a temporary key such as '-1'.
            var acme1 = em1.createEntity('Order', { ShipName: "Acme" });

            // export without metadata
            var exported = em1.exportEntities([acme1], false);

            // ... much time passes
            // ... the client app is relaunched
            resetTempKeyGeneratorSeed();
            
            // create a new em2 
            var em2 = newEm();

            // Add a new order to it
            // this new order has a temporary key.
            var beta = em2.createEntity('Order', { ShipName: "Beta" });
            
            // Its key will be '-1' ... the same key as acme1!!!
            equal(beta.OrderID(), -1, "beta should have same key value as acme");

            // Import the the exported acme1 from em1
            // and get the newly merged instance from em2
            var imported = em2.importEntities(exported);
            var acme2 = imported.entities[0];

            // compare the "same" order as it is in managers #1 and #2 
            equal(acme1.ShipName(), acme2.ShipName(),
                'ShipNames should be the same.');
            
            // breeze had to update the key because 'beta' already has ID==-1
            notEqual(acme1.OrderID(),acme2.OrderID(),
                'OrderIDs have changed.');         
        });
    
    /*********************************************************
    * can validate exported entities upon import
    * exercise importEntities metadataVersionFn
    *********************************************************/
    test("can validate exported entities upon import",
        function () {
            // clone the module's MetadataStore
            // and create new manager that uses that clone
            var store = cloneStore(getModuleStore());
            var em1 = new breeze.EntityManager({                
                serviceName: serviceName,
                metadataStore: store
            });
            
            // set the MetadataStore.name with a test "model version" 
            var metadataName = "modelVersion: 1.2.3";
            store.setProperties({
                name: metadataName
            });

            // define a function to validate imported data
            var importValidationFn = createImportValidationFn(metadataName);
            
            // add an entity to the manager 
            var cust = em1.createEntity("Customer", {
                CustomerID: breeze.core.getUuid(),
                CompanyName: "Foo"
            });
            
            // export cache w/o metadata
            var exported = em1.exportEntities(null, false);
            
            // create clone manager and import
            var em2 = em1.createEmptyCopy();
            
            try {
                var imported = em2.importEntities(exported, {
                    metadataVersionFn: importValidationFn
                });
                ok(imported.entities.length == 1 && 
                   imported.entities[0].CustomerID() == cust.CustomerID(),
                   "imported the Customer successfully");
            } catch(e) {
                ok(false, "import threw exception, '{0}'.".format(e.message));
            }
        });
    
    /* helpers */
    function resetTempKeyGeneratorSeed() {
        // A relaunch of the client would reset the temporary key generator
        // Simulate that for test purposes ONLY with an internal seed reset 
        // that no one should know about or ever use.
        // SHHHHHHHH!
        // NEVER DO THIS IN YOUR PRODUCTION CODE
        breeze.DataType.constants.nextNumber = -1;
    }
    
    function getModuleStore() {
        if (!moduleMetadataStore) {
            moduleMetadataStore = newEm().metadataStore;
        }
        return moduleMetadataStore;
    }
    
    function cloneStore(source) {
        var metaExport = source.exportMetadata();
        return new breeze.MetadataStore().importMetadata(metaExport);
    }
 
    function createImportValidationFn(metadataStoreName) {
        
        return function (cfg) {
            if (breeze.metadataVersion !== cfg.metadataVersion) {
                throw new Error(
                    "Import breeze metadata version, " +
                        cfg.metadataVersion +
                        ", should be " + breeze.metadataVersion);
            }

            if (metadataStoreName !== cfg.metadataStoreName) {
                throw new Error(
                    "Import application model version, " +
                        cfg.metadataStoreName +
                        ", should be " + metadataStoreName);
            }
        };
    }
    
})(docCode.testFns, docCode.northwindTestData);