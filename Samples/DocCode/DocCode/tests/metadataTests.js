// ReSharper disable InconsistentNaming
(function (testFns, northwindMetadata) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var MetadataStore = breeze.MetadataStore;

    var northwindService = testFns.northwindServiceName;
    var northwindMetadataStore = new MetadataStore();

    var handleFail = testFns.handleFail;
    var verifyQuery = testFns.verifyQuery;

    // types for testing
    var customerType;

    //#region Basic metadata tests

    module("metadataTests", { setup: northwindMetadataStoreSetup });

    // Populate the northwindMetadataStore with Northwind service metadata
    function northwindMetadataStoreSetup() {
               
        if (!northwindMetadataStore.isEmpty()) return; // got it already
        //loadMetadataFromServer();
        loadMetadataFromScript();

        function loadMetadataFromServer() {
            stop(); // going async for metadata ...
            northwindMetadataStore.fetchMetadata(northwindService)
                .then(assertCanGetTypeFromMetadata)
                .fail(handleFail)
                .fin(start);
        }

        function loadMetadataFromScript() {
            testFns.importCsdlMetadata(northwindMetadataStore, northwindMetadata);
            
            // Associate these metadata data with the Northwind service
            northwindMetadataStore.addDataService(
                new breeze.DataService({ serviceName: northwindService }));
            
            assertCanGetTypeFromMetadata();
        }
        
        function assertCanGetTypeFromMetadata() {
            customerType = northwindMetadataStore.getEntityType("Customer", true);
            if (!customerType) {
                ok(false, "can get Customer type info");
            }
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

        var metaExport = northwindMetadataStore.exportMetadata();
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

        var metaExport = northwindMetadataStore.exportMetadata();

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

        ok(!northwindMetadataStore.hasMetadataFor(todosServiceName),
            "module metadataStore should not have info about " + todosServiceName);

        var todoType = northwindMetadataStore.getEntityType("TodoItem", true);
        ok(todoType == null, "therefore can't get TodoItem type info");

        var testStore = clonenorthwindMetadataStore();

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
    * Can run two queries in parallel for fresh EM w/ empty metadataStore
    * Proves that simultaneous "first time" queries that can both request metadata
    * without a race condition.
    *********************************************************/
    test("Can run two queries in parallel for fresh EM w/ empty metadataStore", 1,
        function () {
            var em = new breeze.EntityManager("breeze/todos");
            var query = breeze.EntityQuery.from("Todos");
            var successCount = 0;
            stop();
            var prom1 = em.executeQuery(query)
                .then(function () { return successCount++; })
                .fail(queryFailed);
            var prom2 = em.executeQuery(query)
               .then(function () { return successCount++; })
               .fail(queryFailed);

            Q.all([prom1, prom2])
                .then(function () {
                    equal(successCount, 2, "two queries should succeed");
                })
                .fail(queryFailed)
                .fin(start);

            function queryFailed(error) {
                ok(false, "query failed when successCount is " + successCount +
                    " with error message = " + error.message);
            }
        });

    /*********************************************************
    * Can add type to metadataStore
    *********************************************************/
    test("can add 'UserPartial' type to metadataStore", 5, function () {
        var metastore = clonenorthwindMetadataStore();
        var em = newNorthwindEm(metastore);

        defineUserPartialType(metastore);

        var userPartialType = metastore.getEntityType('UserPartial');
        ok(userPartialType !== null,
            "'UserPartial' type should be in metadata");

        var query = breeze.EntityQuery
            .from("GetUserById")
            .withParameters({ Id: 3 }); // id=3 has two UserRoles

        verifyQuery(em, query, "GetUserById",
            assertResultsAreEntitiesInCache);

        function assertResultsAreEntitiesInCache(data) {
            var user = data.results[0];
            
            if (!user.entityType) {
                ok(false, "1st result should be an 'EntityType' but is not");
                return; // must leave, else qunit infinite loop
            }
        
            ok (user.entityType === userPartialType,
                "1st result should be an 'UserPartial' entity type");

            var state = user.entityAspect.entityState;
            equal(state, breeze.EntityState.Unchanged,
              "the 'UserPartial' result should be in cache in an 'Unchanged' state");

            ok(user.Password === undefined, // it is NOT the same as the User type
                "result should not have a 'Password' property");
        }

    });
    
    function defineUserPartialType(metadataStore) {
        var namespace = metadataStore.getEntityType('User').namespace;
        var type = new breeze.EntityType({
            shortName: 'UserPartial',
            namespace: namespace
        });
        var DP = breeze.DataProperty;
        var id = new DP({
            nameOnServer: 'Id',
            dataType: breeze.DataType.Int32,
            isPartOfKey: true,
        });
        type.addProperty(id);
        type.addProperty(new DP({ nameOnServer: 'FirstName' }));
        type.addProperty(new DP({ nameOnServer: 'LastName' }));
        type.addProperty(new DP({ nameOnServer: 'Email' }));
        type.addProperty(new DP({ nameOnServer: 'RoleNames' }));

        metadataStore.addEntityType(type);
        return type;
    }
    /*********************************************************
    * Can project into a client-defined, made-up type 
    *********************************************************/
    test("can project into the 'EmployeePartial' client-defined, made-up type", 4, function () {
        var store = clonenorthwindMetadataStore();
        var employeePartialType = defineEmployeePartialType(store);
        var em = newNorthwindEm(store);

        var query = breeze.EntityQuery.from('Employees')
            .where('EmployeeID', 'eq', 1)
            .select('EmployeeID, FirstName, LastName, Orders')
            .toType('EmployeePartial')
            .using(em);
        
        stop(); // going async
        query.execute().then(success).fail(handleFail).fin(start);
        
        function success(data) {
            var emp = data.results[0];
            ok(emp, "should get a projected 'Employee'");
            ok(emp.entityAspect, "should project it into an entity");
            equal(emp.entityType, employeePartialType,
            "the projected type should be " + employeePartialType.name);
            var orderCount = emp.Orders().length;
            ok(orderCount,
               "the projected 'Employee' should have 'Orders', got " + orderCount);
        }

    });
    
    function defineEmployeePartialType(metadataStore) {
        var empType = metadataStore.getEntityType('Employee');

        var type = new breeze.EntityType({
            shortName: 'EmployeePartial',
            namespace: empType.namespace
        });
        var DP = breeze.DataProperty;
        var idProperty = new DP({
            nameOnServer: 'EmployeeID',
            dataType: breeze.DataType.Int32,
            isPartOfKey: true,
        });
        type.addProperty(idProperty);
        type.addProperty(new DP({ nameOnServer: 'FirstName' }));
        type.addProperty(new DP({ nameOnServer: 'LastName' }));

        // Get the navigation property from Employee to Orders
        var assoc = empType.getNavigationProperty('Orders');
        
        type.addProperty(new breeze.NavigationProperty({
              nameOnServer: 'Orders'
            , isScalar: false  // it's a collection
            , entityTypeName: assoc.entityType.name
            , foreignKeyNames: assoc.inverse.foreignKeyNames
            , associationName: assoc.associationName
        }));
        
        metadataStore.addEntityType(type);
        return type;
    }

    //#endregion

    //#region NamingConvention Tests
    
    module("metadataTests (NamingConvention)",
        { setup: namingConventionMetadataStoreSetup });

    var camelCaseMetadataStore;

    // Populate the namingConventionMetadataStore with Northwind service metadata
    // Use the camelCase naming convention shipped in Breeze
    // N.B.: Typically would set the naming convention one for all application managers
    //       e.g. breeze.NamingConvention.camelCase.setAsDefault();
    //       Not doing so in these tests in order to avoid cross-test pollution
    function namingConventionMetadataStoreSetup() {
        
        if (camelCaseMetadataStore) return; // got it already

        camelCaseMetadataStore =
            // use the camelCase naming convention shipped in Breeze
            new MetadataStore({ namingConvention: breeze.NamingConvention.camelCase });

        var fetchMetadataPromises =
            [camelCaseMetadataStore.fetchMetadata(northwindService)];
        
        if (northwindMetadataStore.isEmpty()) {
            // don't have default metadataStore; get it too
            fetchMetadataPromises.push(
                northwindMetadataStore.fetchMetadata(northwindService));
        }
        
        stop(); // going async for metadata ...
        Q.all(fetchMetadataPromises) // wait for all metadata fetches to finish
        .fail(handleFail)
        .fin(start);
    }

    // A naming convention that prepends an underscore (_) to every property name.
    var underscoreNamingConvention = new breeze.NamingConvention({
        serverPropertyNameToClient: function(serverPropertyName) {
            return "_" + serverPropertyName;
        },
        clientPropertyNameToServer: function(clientPropertyName) {
            return clientPropertyName.substr(1);
        }            
    });
    /*********************************************************
    * camelCasing NamingConvention applies to entity creation
    *********************************************************/
    test("camelCasing NamingConvention applies to entity creation", 4, function () {

        var defaultCustomerType = northwindMetadataStore.getEntityType("Customer");
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

        var em = new breeze.EntityManager(
            {
                serviceName: northwindService,
                metadataStore: camelCaseMetadataStore
            });

        var query = breeze.EntityQuery.from("Customers")
            // notice using camelCase property name in predicate!
            .where("companyName", "startsWith", "A");

        stop();
        em.executeQuery(query)
            .then(function (data) {
                ok(data.results.length > 0,
                    "should have 'camelCase companyName' query results");
            })
            .fail(handleFail)
            .fin(start);
        //testFns.verifyQuery(em, query, "camelCase companyName query");
    });

    //#endregion

    //#region Basic and NamingConvention Test Helpers
    /*********************************************************
    * Basic and NamingConvention Test Helpers
    *********************************************************/
    function clonenorthwindMetadataStore() {
        return cloneStore(northwindMetadataStore);
    }

    function cloneStore(source) {
        var metaExport = source.exportMetadata();
        return new MetadataStore().importMetadata(metaExport);
    }

    function newNorthwindEm(metadataStore) {
        return new breeze.EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || northwindMetadataStore
        });
    }

    function _hasOwnProperty(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key)
    }
    //#endregion

})(docCode.testFns, docCode.northwindMetadata);