// ReSharper disable InconsistentNaming
define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/

    var entityModel = testFns.breeze.entityModel;
    var MetadataStore = entityModel.MetadataStore;
    var moduleMetadataStore = new MetadataStore();
    var northwindService = testFns.northwindServiceName;
    var handleFail = testFns.handleFail;

    // types for testing
    var customerType;

    module("metadataTests", { setup: moduleMetadataStoreSetup });

    // Populate the moduleMetadataStore with Northwind service metadata
    function moduleMetadataStoreSetup() {
        if (!moduleMetadataStore.isEmpty()) return; // got it already

        stop(); // going async for metadata ...
        moduleMetadataStore.fetchMetadata(northwindService) 
        .then(getTypesForTesting)
        .fail(handleFail)
        .fin(start);
    }

    function getTypesForTesting() {
        customerType = moduleMetadataStore.getEntityType("Customer", true);
        if (!customerType) {
            ok(false, "can get Customer type info");
        }
    }
    
    /*********************************************************
    * Customer has no entity level validators
    *********************************************************/
    test("Customer has no entity level validators", 1, function () {
        var validators = customerType.validators, valCount = validators.length;
        ok(!valCount, "customer type shouldn't have entity validators; count = " + valCount);
    });

    /*********************************************************
    * Can export and import a metadataStore
    *********************************************************/
    test("export and import a metadataStore", 2, function () {

        var metaExport = moduleMetadataStore.export();
        var newStore = new MetadataStore();
        newStore.import(metaExport);

        ok(newStore.hasMetadataFor(northwindService), "newStore has metadata for Northwind");

        var custType = newStore.getEntityType("Customer", true);
        ok(custType !== null, "can get Customer type info from newStore");
    });

    /*********************************************************
    * Can export and import a metadataStore to file
    *********************************************************/
    test("export and import a metadataStore from local storage", 2, function () {

        var metaExport = moduleMetadataStore.export();

        ok(window.localStorage, "this browser supports local storage");

        window.localStorage.setItem('metadata', metaExport);

        var metaImport = window.localStorage.getItem('metadata');

        var newStore = new MetadataStore().import(metaImport);

        ok(newStore.hasMetadataFor(northwindService), "newStore has metadata for Northwind");
    });

    /*********************************************************
    * Can add a 2nd service to a metadataStore
    *********************************************************/
    test("add a 2nd service to a metadataStore", 4, function () {

        var todosServiceName = testFns.todosServiceName;

        ok(!moduleMetadataStore.hasMetadataFor(todosServiceName),
            "module metadataStore should not have info about " + todosServiceName);

        var todoType = moduleMetadataStore.getEntityType("TodoItem", true);
        ok(todoType == null, "therefore can't get TodoItem type info");

        var testStore = cloneModuleMetadataStore();

        stop(); // going async 
        // get Todos service metadata
        testStore.fetchMetadata(todosServiceName) 

        .then(function () {

            todoType = testStore.getEntityType("TodoItem", true);
            ok(todoType !== null, "have TodoItem type info after fetchMetadata");

            var custType = testStore.getEntityType("Customer", true);
            ok(custType !== null, "still have Customer type info as well");
        })

        .fail(handleFail)
        .fin(start);
    });




    /*********************************************************
    * helpers
    *********************************************************/
    function cloneModuleMetadataStore() {
        return cloneStore(moduleMetadataStore);
    }

    function cloneStore(source) {
        var metaExport = source.export();
        return new MetadataStore().import(metaExport);
    }
});