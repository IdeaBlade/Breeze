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

        var metaExport = moduleMetadataStore.exportMetadata();
        var newStore = new MetadataStore();
        newStore.importMetadata(metaExport);

        ok(newStore.hasMetadataFor(northwindService), "newStore has metadata for Northwind");

        var custType = newStore.getEntityType("Customer", true);
        ok(custType !== null, "can get Customer type info from newStore");
    });

    /*********************************************************
    * Can export and import a metadataStore to file
    *********************************************************/
    test("export and import a metadataStore from local storage", 2, function () {

        var metaExport = moduleMetadataStore.exportMetadata();

        ok(window.localStorage, "this browser supports local storage");

        window.localStorage.setItem('metadata', metaExport);

        var metaImport = window.localStorage.getItem('metadata');

        var newStore = new MetadataStore().importMetadata(metaImport);

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
  
    


    /*** NamingConvention Tests ***/
    
    module("metadataTests (NamingConvention)",
        { setup: namingConventionMetadataStoreSetup });

    var camelCaseMetadataStore;

    // Populate the namingConventionMetadataStore with Northwind service metadata
    function namingConventionMetadataStoreSetup() {
        
        if (camelCaseMetadataStore) return; // got it already

        camelCaseMetadataStore =
            new MetadataStore({ namingConvention: camelCaseNamingConvention });

        var fetchMetadataPromises =
            [camelCaseMetadataStore.fetchMetadata(northwindService)];
        
        if (moduleMetadataStore.isEmpty()) {
            // don't have default metadataStore; get it too
            fetchMetadataPromises.push(
                moduleMetadataStore.fetchMetadata(northwindService));
        }
        
        stop(); // going async for metadata ...
        Q.all(fetchMetadataPromises) // wait for all metadata fetches to finishe
        .fail(handleFail)
        .fin(start);
    }

    // A naming convention that converts the first character of every property name to uppercase on the server
    // and lowercase on the client.
    var camelCaseNamingConvention = new entityModel.NamingConvention({
        serverPropertyNameToClient: function(serverPropertyName) {
            return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
        },
        clientPropertyNameToServer: function(clientPropertyName) {
            return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
        }            
    });
    /*********************************************************
    * camelCasing NamingConvention applies to entity creation
    *********************************************************/
    test("camelCasing NamingConvention applies to entity creation", 4, function () {

        var defaultCustomerType = moduleMetadataStore.getEntityType("Customer");
        var defaultCust = defaultCustomerType.createEntity();
        
        ok(defaultCust["CompanyName"],
            "'CompanyName' property should be defined for Customer in default MetadataStore");
        ok(!defaultCust["companyName"],
            "'companyName' property should NOT be defined for Customer in default MetadataStore");
        
        var camelCustomerType = camelCaseMetadataStore.getEntityType("Customer");
        var camelCust = camelCustomerType.createEntity();
        
        ok(!camelCust["CompanyName"],
            "'CompanyName' property should NOT be defined for Customer in camelCaseMetadataStore");
        ok(camelCust["companyName"],
            "'companyName' property should be defined for Customer in camelCaseMetadataStore");

    });
    
    /*********************************************************
    * query with camelCase
    *********************************************************/
    test("query with camelCasing NamingConvention", 1, function () {

        var em = new entityModel.EntityManager(
            {
                serviceName: northwindService,
                metadataStore: camelCaseMetadataStore
            });

        var query = entityModel.EntityQuery.from("Customers")
            // notice using camelCase property name in predicate!
            .where("companyName", "startsWith", "A");

        stop();
        em.executeQuery(query)
            .then(function(data) {
                ok(data.results.length > 0,
                    "should have 'camelCase companyName' query results");
            })
            .fail(handleFail)
            .fin(start);
        //testFns.verifyQuery(em, query, "camelCase companyName query");
    });


    /*********************************************************
    * helpers
    *********************************************************/
    function cloneModuleMetadataStore() {
        return cloneStore(moduleMetadataStore);
    }

    function cloneStore(source) {
        var metaExport = source.exportMetadata();
        return new MetadataStore().importMetadata(metaExport);
    }
});