// ReSharper disable InconsistentNaming
(function (testFns, northwindMetadata, northwindDtoMetadata) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var MetadataStore = breeze.MetadataStore;
    var Validator = breeze.Validator;

    var northwindService = testFns.northwindServiceName;
    var northwindDtoService = testFns.northwindDtoServiceName;

    var camelCaseConvention = breeze.NamingConvention.camelCase;

    var northwindMetadataStore = new breeze.MetadataStore({
        namingConvention: camelCaseConvention
    });

    var northwindDtoMetadataStore = new breeze.MetadataStore({
        namingConvention: camelCaseConvention
    });

    var handleFail = testFns.handleFail;
    var verifyQuery = testFns.verifyQuery;

    //#region Client-defined metadata Tests

    var clientStore, serverStore, serviceName;

    module("metadataTests (client defined metadata)", { setup: clientDefinedMetadataSetup });

    function clientDefinedMetadataSetup() {
        serviceName = northwindService;
        serverStore = metadataStoreSetup(
            northwindMetadataStore, northwindMetadata, serviceName, postProcessNorthwindServerStore);
        clientStore = testFns.metadataOnClient.createProductMetadataStore(serviceName);
    }

    // tweak serverStore based on intentional client differences
    function postProcessNorthwindServerStore(store) {

        var supplierType = store.getEntityType('Supplier');
        // add phone validator to Supplier.phone
        supplierType.getDataProperty('phone').validators.push(Validator.phone());
        // delete the unneeded and unwanted key "invForeignKeyNames" from Supplier.products
        var prop = supplierType.getNavigationProperty('products');
        delete prop.invForeignKeyNames;

        return store;
    }

    /*********************************************************
    * 4 Types defined in client metadata are in metadata from server
    *********************************************************/
    test("The 4 types defined in client metadata are in metadata from server", 2, function () {
        var clientTypes = clientStore.getEntityTypes();
        var serverTypes = serverStore.getEntityTypes();

        var clientTypeNames = clientTypes.map(function (type) { return type.name; }).join(', ');
        var serverTypeNames = serverTypes.map(function (type) { return type.name; }).join(', ');

        equal(clientTypes.length, 4,
            "client metadata should define 4 types; actually defined {0}."
            .format(clientTypeNames));

        var missing = [];
        clientTypes.forEach(function (type) {
            if (serverTypeNames.indexOf(type.name) === -1) {
                missing.push(type.name);
            }
        });

        missing = missing.join(', ');
        ok(missing.length === 0,
        "All client MetadataStore types should be in server store; missing {0}."
        .format(missing ? missing : 'none'));

    });

    /*********************************************************
    * Compare individual types in client and server metadata
    *********************************************************/
    test("Category EntityTypes match in client and server metadata", function () {
        compareClientAndServerTypes('Category');
    });

    test("Location ComplexTypes match in client and server metadata", function () {
        compareClientAndServerTypes('Location');
    });

    test("Product EntityTypes match in client and server metadata", function () {
        compareClientAndServerTypes('Product');
    });

    test("Supplier EntityTypes match in client and server metadata", function () {
        compareClientAndServerTypes('Supplier');
    });

    test("can create a Category", function () {
        var manager = createManagerWithClientMetadata();
        var entity = manager.createEntity('Category', {
            categoryName: "Toy",
            description: "A test category"
        });
        expectAddedEntity(entity);
    });

    test("can create a Supplier with a Location ComplexType", function () {
        var manager = createManagerWithClientMetadata();
        var testLocation = createTestLocation();

        var supplier = manager.createEntity('Supplier', {
            companyName: "IdeaBlade",
            location: testLocation
        });
        expectAddedEntity(supplier);

        var city = supplier.location().city();
        equal(city, testLocation.city(),
            "Supplier's city should be '{0}'; it is '{1}'."
            .format(testLocation.city(), city));
    });

    test("can extract custom metadata from the Supplier type", function () {
        var supplierType = clientStore.getEntityType('Supplier');
        var custom = JSON.stringify(supplierType.custom);
        ok(custom != null, "Should have entity-level custom metadata and got: " + custom);
    });

    test("can extract custom metadata from the Supplier.companyName property", function () {
        var supplierType = clientStore.getEntityType('Supplier');
        var nameProperty = supplierType.getDataProperty('companyName');
        var custom = JSON.stringify(nameProperty && nameProperty.custom);
        ok(custom != null, "Should have Supplier.companyName custom metadata and got: " + custom);
    });
    //#endregion

    //#region Client-defined DTO metadata Tests

    module("metadataTests (client defined DTO metadata)", { setup: clientDefinedDtoMetadataSetup });

    function clientDefinedDtoMetadataSetup() {
        serviceName = northwindDtoService;
        serverStore = metadataStoreSetup(northwindDtoMetadataStore, northwindDtoMetadata, serviceName)
        clientStore = testFns.metadataOnClient.createDtoMetadataStore(serviceName);
    }

    /*********************************************************
     * Compare individual types in client and server metadata
     *********************************************************/

    test("Customer EntityTypes match in client and server DTO metadata", function () {
        compareClientAndServerTypes('Customer');
    });

    test("Order EntityTypes match in client and server DTO metadata", function () {
        compareClientAndServerTypes('Order');
    });

    test("OrderDetail EntityTypes match in client and server DTO metadata", function () {
        compareClientAndServerTypes('OrderDetail');
    });

    test("Product EntityTypes match in client and server DTO metadata", function () {
        compareClientAndServerTypes('Product');
    });

    //#endregion

    //#region Client-defined Metadata Test Helpers

    /* ----- Client-defined Metadata helpers -------*/

    function compareClientAndServerTypes(typeName) {
        var clientType = clientStore.getEntityType(typeName);
        var serverType = serverStore.getEntityType(typeName);
        expectTypesToMatch(clientType, serverType);
    }

    function createManagerWithClientMetadata() {
        return new breeze.EntityManager({
            serviceName: serviceName,
            metadataStore: clientStore
        });
    } 

    function createTestLocation() {
        var Location = clientStore.getEntityType('Location');
        return Location.createInstance({
            address: '6001 Shellmound', city: 'Emeryville', region: 'CA'
        });
    }

    function expectAddedEntity(entity, entityName) {
        var entityState = entity.entityAspect.entityState;
        entityName = entityName || "'"+entity.entityType.shortName + "'";
        ok(entityState.isAdded(),
            "a created {0} should have 'Added' state; its entityState is '{1}'."
            .format(entityName, entityState));
    }

    function expectTypesToMatch(client, server) {
        var ok = true;
        var problems = [];
        equal(client.name, server.name,
            "both type names (shortName + namespace) should be "+server.name);
        equal(client.defaultResourceName, server.defaultResourceName,
            "both defaultResourceName should be " + server.defaultResourceName);
        if (!client.isComplexType) {
            equal(client.autoGeneratedKeyType.name, server.autoGeneratedKeyType.name,
                "both autoGeneratedKeyType should be " + server.autoGeneratedKeyType.name);
        }

        var cdps = sortByName(client.dataProperties).map(copySafeProperties);
        var sdps = sortByName(server.dataProperties).map(copySafeProperties);
        deepEqual(cdps, sdps, "dataProperties should match");
        
        var cnps = sortByName(client.navigationProperties).map(copySafeProperties);
        var snps = sortByName(server.navigationProperties).map(copySafeProperties);
        deepEqual(cnps, snps, "navigationProperties should match");
    }

    // Clone an entityProperty (dataProperty or navigationProperty), 
    // keeping only their safe properties (non-circular ones)
    function copySafeProperties(entityProperty) {
        var result = {};
        var isNavProp = entityProperty.isNavigationProperty;

        for (var key in entityProperty) {
            var prop = entityProperty[key];
            if (prop == null) {
                result[key] = prop;
            } else if (key === 'custom') {
                // skip comparison of custom values
            } else if (key === 'parentType') {
                // skip it
            } else if (key === 'inverse') {
                result['inverseTypeName'] = prop.entityTypeName;
            } else if (key === 'entityType' && isNavProp) {
               // skip it
            } else if (key == "validators") {
                result[key] = sortByName(prop);
            } else {
                result[key] = prop;
            }
        }

        return JSON.stringify(result);
    }

    function sortByName(array) {
        return array.sort(function (left, right) {
            return (left.name > right.name) ? 1 : -1;
        });
    }

    // Populate a MetadataStore with service metadata
    function metadataStoreSetup(store, csdlMetadata, serviceName, postProcess) {

        if (store.isEmpty()) {
            loadMetadataFromScript();
            if (postProcess) { store = postProcess(store);}
        }
        return store;

        function loadMetadataFromScript() {
            testFns.importCsdlMetadata(store, csdlMetadata);

            // Associate these metadata data with a serviceName
            store.addDataService(
                new breeze.DataService({ serviceName: serviceName }));

            assertCanGetTypeFromMetadata();
        }

        function assertCanGetTypeFromMetadata() {
            var customerType = store.getEntityType("Customer", true);
            if (!customerType) {
                ok(false, "can get Customer type info");
            }
        }
    }

    //#endregion

})(docCode.testFns, docCode.northwindMetadata, docCode.northwindDtoMetadata);