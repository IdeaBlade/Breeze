// ReSharper disable InconsistentNaming
define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var entityModel = breeze.entityModel;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityQuery = entityModel.EntityQuery;

    var moduleMetadataStore = new MetadataStore();
    var northwindService = testFns.northwindServiceName;
    var handleFail = testFns.handleFail;

    module("entityExtensionTests", { setup: moduleMetadataStoreSetup });

    // Populate the moduleMetadataStore with Northwind service metadata
    function moduleMetadataStoreSetup() {
        if (!moduleMetadataStore.isEmpty()) return; // got it already

        stop(); // going async for metadata ...
        moduleMetadataStore.fetchMetadata(northwindService)
        .fail(handleFail)
        .fin(start);
    }

    /*********************************************************
    * add property directly to customer instance
    *********************************************************/
    test("add property directly to customer instance", 2, function () {
        var customerType = moduleMetadataStore.getEntityType("Customer");
        var cust = customerType.createEntity();
        cust.foo = ko.observable("foo");
        ok(cust["foo"],
            "should have 'foo' property after adding directly to instance");
        
        var propInfo = customerType.getProperty("foo");
        // The Breeze customerType knows nothing about it.
        ok(propInfo === null, "'foo' should be unknown to the customer type");
    });
    
    /*********************************************************
    * add property via constructor
    *********************************************************/
    test("add property via constructor", 3, function () {
        var store = cloneModuleMetadataStore();
        
        var customerCtor = function() {
            this.foo = 42;
        };
        
        store.registerEntityTypeCtor("Customer", customerCtor);
        
        var customerType = store.getEntityType("Customer");
        var unmapped = customerType.unmappedProperties;
        
        var cust = customerType.createEntity();

        ok(cust["foo"],
            "should have 'foo' property via constructor");
        
        // Breeze identified the property as "unmapped"
        ok(unmapped.length === 1 && unmapped[0].name === "foo",
            "foo should be the lone unmapped property");
        
        // Breeze converted it into a KO property and initialized it
        equal(cust.foo(), 42,
            "'foo' should be a KO 'property' returning 42");
    }); 

    /*********************************************************
    * add KO property via constructor
    *********************************************************/
    test("add KO property via constructor", 3, function () {
        var store = cloneModuleMetadataStore();

        var customerCtor = function () {
            this.foo = ko.observable(42);
        };

        store.registerEntityTypeCtor("Customer", customerCtor);

        var customerType = store.getEntityType("Customer");
        var unmapped = customerType.unmappedProperties;

        var cust = customerType.createEntity();
        
        ok(cust["foo"],
            "should have 'foo' property via constructor");

        // Although 'foo' is a function, it is listed as an unmapped property
        equal(unmapped.length, 1, "foo should be an unmapped property");

        equal(cust.foo(), 42,
            "'foo' should be a KO 'property' returning 42");
    });

    /*********************************************************
    * add instance function via constructor
    *********************************************************/
    test("add instance function via constructor", 3, function () {
        var store = cloneModuleMetadataStore();

        var customerCtor = function () {
            this.foo = function () { return 42;};
        };

        store.registerEntityTypeCtor("Customer", customerCtor);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        ok(cust["foo"],
            "should have 'foo' property via constructor");

        // 'foo' is a non-KO function; it is NOT listed as an unmapped property
        // The Breeze customerType knows nothing about it.
        var propInfo = customerType.getProperty("foo");
        ok(propInfo === null, "'foo' should be unknown to the customer type");

        equal(cust.foo(), 42,
            "'foo' should be a function returning 42");
    });
    
    /*********************************************************
    * add mapped data property via constructor
    *********************************************************/
    test("add mapped data property via constructor", 4, function () {
        var store = cloneModuleMetadataStore();

        var customerCtor = function () {
            this.CompanyName = "Acme"; // N.B.: Not defined as a KO property
        };

        store.registerEntityTypeCtor("Customer", customerCtor);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        ok(cust["CompanyName"],
            "should have 'CompanyName' property via constructor");

        // 'CompanyName' is a mapped data property
        var propInfo = customerType.getProperty("CompanyName");
        ok(propInfo !== null, "'CompanyName' should be known to the customer type");
        ok(!propInfo.isUnmapped, "'CompanyName' should be a mapped property");
        
        // Although defined as a field, Breeze made it a KO property and initialized it
        equal(cust.CompanyName(), "Acme",
            "'CompanyName' should be a KO 'property' returning Acme");
    });
    /*********************************************************
    * add method to prototype via constructor
    *********************************************************/
    test("add method to prototype via constructor", 2, function () {
        var store = cloneModuleMetadataStore();

        var customerCtor = function () { };
        
        customerCtor.prototype.foo = function (name) {
            return "Hi there, {0}!".format(name);
        };
        
        store.registerEntityTypeCtor("Customer", customerCtor);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        ok(cust["foo"],
            "should have 'foo' member via constructor");

        var expected = "Hi there, Bob!";
        equal(cust.foo("Bob"), expected,
            "'foo' function should return expected message, '{0}'."
                .format(expected));
    });
    /*********************************************************
    * add subscription in post-construction initializer
    *********************************************************/
    test("add subscription in post-construction initializer", 1, function () {
        var store = cloneModuleMetadataStore();

        var customerCtor = function () {};

        var companyNameNotificationCount = 0;
        var customerInitializer = function(customer) {
            customer.CompanyName.subscribe(
                function (newValue) {
                    companyNameNotificationCount += 1;
            });
        };
        
        store.registerEntityTypeCtor("Customer", customerCtor, customerInitializer);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        cust.CompanyName("Beta");

        equal(companyNameNotificationCount, 1,
            "should have raised 'CompanyName' change notification once");
    });
    /*********************************************************
    * add property in post-construction initializer
    *********************************************************/
    test("add property in post-construction initializer", 2, function () {
        var store = cloneModuleMetadataStore();

        var customerCtor = function () { };

        var customerInitializer = function (customer) {
            customer.foo = "Foo " + customer.CompanyName();
        };

        store.registerEntityTypeCtor("Customer", customerCtor, customerInitializer);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        equal(cust.foo, "Foo ",
            "'foo' property, created in initializer, should return 'Foo");
        
        var propInfo = customerType.getProperty("foo");
        // The Breeze customerType knows nothing about it.
        ok(propInfo === null, "'foo' should be unknown to the customer type");

    });
    /*********************************************************
    * queried entity has new property from post-construction initializer
    *********************************************************/
    test("queried entity has new property from post-construction initializer", 1,
        function () {
            var store = cloneModuleMetadataStore();

            var customerCtor = function () { };

            var customerInitializer = function (customer) {
                customer.foo = "Foo " + customer.CompanyName();
            };

            store.registerEntityTypeCtor("Customer", customerCtor, customerInitializer);
        
            // create EntityManager with extended metadataStore
            var em = newEm(store);
            var query = EntityQuery.from("Customers").top(1);

            stop(); // going async
            em.executeQuery(query)
                .then(function (data) {
                    var cust = data.results[0];
                    equal(cust.foo, "Foo "+cust.CompanyName(),
                        "'foo' property, created in initializer, performed as expected");
                })
                .fail(handleFail)
                .fin(start);
    });

    /*********************************************************
    * can define custom temporary key generator
    * must conform to the keygenerator-interface
    * http://www.breezejs.com/sites/all/apidocs/classes/~keyGenerator-interface.html
    *********************************************************/
    test("can define custom temporary key generator", 5,
        function () {
            var em = newEm();

            // add statics for testing the key generator
            var tempIds = testKeyGenerator.tempIds = [];

            em.setProperties({ keyGeneratorCtor: testKeyGenerator });
            em.clear(); // TODO: Remove this workaround for Breeze bug in v.0.63.4

            // Order has an integer key
            var orderEntityType = em.metadataStore.getEntityType("Order");
            var o1 = orderEntityType.createEntity();
            var o2 = orderEntityType.createEntity();

            // temporary keys are assigned when added to an EntityManager
            em.addEntity(o1);
            em.addEntity(o2);

            // Customer has a Guid key
            var customerEntityType = em.metadataStore.getEntityType("Customer");
            var c1 = customerEntityType.createEntity();
            var c2 = customerEntityType.createEntity();
            em.addEntity(c1);
            em.addEntity(c2);

            equal(tempIds.length, 4, "should have 4 tempIds");
            equal(o1.OrderID(), tempIds[0], "o1 should have temp key " + tempIds[0]);
            equal(o2.OrderID(), tempIds[1], "o2 should have temp key " + tempIds[1]);
            equal(c1.CustomerID(), tempIds[2], "c1 should have temp key " + tempIds[2]);
            equal(c2.CustomerID(), tempIds[3], "c2 should have temp key " + tempIds[3]);
        });

    function testKeyGenerator() {
        var self = this;
        this.nextNumber = -1000;

        this.generateTempKeyValue = function (entityType) {
            var keyProps = entityType.keyProperties;
            if (keyProps.length > 1) {
                throw new Error("Cannot autogenerate multi-part keys");
            }
            var keyProp = keyProps[0];
            var nextId = GetNextId(keyProp.dataType);
            testKeyGenerator.tempIds.push(nextId);
            return nextId;
        };

        function GetNextId(dataType) {
            if (dataType.isNumeric) {
                return self.nextNumber -= 1;
            }

            if (dataType === entityModel.DataType.Guid) {
                return breeze.core.getUuid();
            }

            throw new Error("Cannot generate key for a property of datatype: " +
                dataType.toString());
        }
    }
    
    /*********************************************************
    * An assigned key is always replaced by key generation
    * if it is a store-generated key
    * Perhaps this rule was deliberately NOT copied from DevForce to Breeze
    *********************************************************/
    //test("store-gen keys are always re-set by key generator upon add to manager", 1,
    //    function () {
    //        var em = newEm();
    //        var orderEntityType = em.metadataStore.getEntityType("Order");
    //        var o1 = orderEntityType.createEntity();
    //        o1.OrderID(42); // waste of time to set id; it will be replaced.
    //        ok(o1.OrderID() !== 42,
    //            "o1's original key, 42, should have been replaced w/ new temp key.");
    //        em.addEntity(o1);
    //    });

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
    function newEm(metadataStore) {
        return new EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || moduleMetadataStore
        });
    }
});