// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;

    var moduleMetadataStore = new MetadataStore();
    var northwindService = testFns.northwindServiceName;
    var todoService = testFns.todosServiceName;
    var handleFail = testFns.handleFail;

    module("entityExtensionTests", { setup: moduleMetadataStoreSetup });

    // Populate the moduleMetadataStore with Northwind service metadata
    function moduleMetadataStoreSetup() {
        if (!moduleMetadataStore.isEmpty()) return; // got it already

        stop(); // going async for metadata ...
        Q.all(
            moduleMetadataStore.fetchMetadata(northwindService),
            moduleMetadataStore.fetchMetadata(todoService))
        .fail(handleFail)
        .fin(start);
    }

    /*********************************************************
    * add property directly to customer instance
    *********************************************************/
    test("add property directly to customer instance", 2, function () {
        var customerType = moduleMetadataStore.getEntityType("Customer");
        var cust = customerType.createEntity();
        cust.isBeingEdited = ko.observable(false);
        ok(typeof cust["isBeingEdited"] === "function",
            "should have 'isBeingEdited' KO property after adding directly to instance");
        
        var propInfo = customerType.getProperty("isBeingEdited");
        // The Breeze customerType knows nothing about it.
        ok(propInfo === null, "'isBeingEdited' should be unknown to the customer type");
    });
    
    /*********************************************************
    * add unmapped property via constructor
    *********************************************************/
    test("add unmapped 'isBeingEdited' property via constructor", 3, function () {
        var store = cloneModuleMetadataStore();
        
        var Customer = function() {
            this.isBeingEdited = false; // notice it is not a KO property here
        };
        
        store.registerEntityTypeCtor("Customer", Customer);
        
        var customerType = store.getEntityType("Customer");
        var unmapped = customerType.unmappedProperties;

        // Breeze identified the property as "unmapped"
        ok(unmapped.length === 1 && unmapped[0].name === "isBeingEdited",
            "'isBeingEdited' should be the lone unmapped property");

        var cust = customerType.createEntity();

        ok(typeof cust["isBeingEdited"] === "function",
            "should have 'isBeingEdited' KO property via constructor");
        
        // Breeze converted it into a KO property and initialized it
        equal(cust.isBeingEdited(), false,
            "'isBeingEdited' should be a KO 'property' returning false");
    });

    /*********************************************************
    * can 'new' the ctor .. but not a full entity until added to manager
    * not recommended; prefer CreateEntity approach
    *********************************************************/
    test("can 'new' an entity via custom ctor and add to manager", 1, function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () {
            // notice these are not defined as KO properties
            this.CustomerID = testFns.newGuidComb();
            this.isBeingEdited = false; 
        };

        store.registerEntityTypeCtor("Customer", Customer);

        var cust = new Customer(); // not recommended;

        var em = newEm(store);
        em.addEntity(cust);

        // Breeze converted it into a KO property and initialized it
        equal(cust.isBeingEdited(), false,
            "'isBeingEdited' should be a KO 'property' returning false");

    });
    /*********************************************************
    * add unmapped 'foo' property via constructor
    *********************************************************/
    test("add unmapped 'foo' property via constructor", 4, function () {
        var store = cloneModuleMetadataStore();
        fooPropertyDefined(store);
        
        var Customer = function () {
            this.foo = 42; // doesn't have to be KO observable; will become observable
        };
        store.registerEntityTypeCtor('Customer', Customer);
        fooPropertyDefined(store, true);

        var cust = store.getEntityType('Customer').createEntity();
        
        ok(cust["foo"],
            "should have 'foo' property via constructor");

        equal(cust.foo(), 42,
            "'foo' should be a KO 'property' returning 42");
    });

    function fooPropertyDefined(metadataStore, shouldBe) {
        var custType = metadataStore.getEntityType("Customer");
        var fooProp = custType.getDataProperty('foo');
        if (shouldBe) {
            ok(fooProp && fooProp.isUnmapped,
                "'foo' property should be defined as unmapped property after registration.");
        } else {
            ok(!fooProp, "'foo' property should NOT be defined before registration.");
        }
        return fooProp;
    }
    /*********************************************************
    * unmapped 'foo' property is validated
    *********************************************************/
    test("unmapped 'foo' property is validated", 5, function () {
        var store = cloneModuleMetadataStore();
        fooPropertyDefined(store);
        // Arrange for 'foo' to be an unmapped Customer property
        var Customer = function () {
            this.foo = "";
        };
        store.registerEntityTypeCtor("Customer", Customer);
        var fooProp = fooPropertyDefined(store, true);

        var maxLengthValidator = breeze.Validator.maxLength({maxLength:5});
        fooProp.validators.push(maxLengthValidator);

        // create new customer
        var manager = newEm(store);
        var cust = manager.createEntity('Customer', {CustomerID: testFns.newGuidComb()});

        cust.foo("funky");
        var errs = cust.entityAspect.getValidationErrors(fooProp);
        ok(0 === errs.length,
            "should not have validation errors about 'foo'.");

        cust.foo("funky and fresh");
        errs = cust.entityAspect.getValidationErrors(fooProp);
        equal(errs.length, 1,
            "should have one validation error about 'foo'.");

        var errMsg = errs[0].errorMessage;
        ok(/foo.*less than/.test(errMsg),
            "error message, \"{0}\", should complain that 'foo' is too long."
            .format(errMsg));

    });

    /*********************************************************
    * when unmapped property changes, what happens to 
    * notifications, EntityState, and originalValues
    *********************************************************/
    test("change to unmapped 'foo' property does not change EntityState", 5, function () {

        // Arrange for 'foo' to be an unmapped Customer property
        var store = cloneModuleMetadataStore();
        var Customer = function () {
            this.foo = 42;
        };
        store.registerEntityTypeCtor("Customer", Customer);

        fooPropertyDefined(store, true);
        
        // Fake an existing customer
        var manager = newEm(store);
        var cust = manager.createEntity(
            'Customer',
            { CustomerID: testFns.newGuidComb() },
            breeze.EntityState.Unchanged);

        // Listen for foo changes
        var koFooNotified, breezeFooNotified;
        cust.foo.subscribe(function () { koFooNotified = true; });
        cust.entityAspect.propertyChanged.subscribe(function (args) {
            if (args.propertyName === "foo") { breezeFooNotified = true; }
        });

        // Act
        cust.foo(12345);

        ok(koFooNotified, "KO should have raised property changed for 'foo'.");
        ok(breezeFooNotified, "Breeze should have raised its property changed for 'foo'.")

        var stateName = cust.entityAspect.entityState.name;
        equal(stateName, "Unchanged",
            "cust's EntityState should still be 'Unchanged'; it is " + stateName);

        var originalValues = cust.entityAspect.originalValues;
        var hasOriginalValues;
        for (var key in originalValues) {
            if (key === 'foo') {
                hasOriginalValues = true;
                break;
            }
        }

        ok(hasOriginalValues,
            "'originalValues' have 'foo'; it is " + JSON.stringify(originalValues));
    });
    /*********************************************************
    * reject changes should revert an unmapped property
    *********************************************************/
    test("reject changes reverts an unmapped property", 2, function () {
        var store = cloneModuleMetadataStore();

        var originalTime = new Date(2013, 0, 1);
        var Customer = function () {
            this.lastTouched = originalTime;
        };

        store.registerEntityTypeCtor("Customer", Customer);

        var manager = newEm(store);

        // create a fake customer
        var cust = manager.createEntity("Customer", { CompanyName: "Acme" },
            breeze.EntityState.Unchanged);
        var touched = cust.lastTouched();

        // an hour passes ... and we visit the customer object
        cust.CompanyName("Beta");
        cust.lastTouched(touched = new Date(touched.getTime() + 60000));

        // an hour passes ... and we visit to cancel
        cust.lastTouched(touched = new Date(touched.getTime() + 60000));
        cust.entityAspect.rejectChanges(); // roll back name change

        equal(cust.CompanyName(), "Acme", "'name' data property should be rolled back");
        ok(originalTime === cust.lastTouched(),
            "'lastTouched' unmapped property should be rolled back. Started as {0}; now is {1}"
            .format(originalTime,  cust.lastTouched()));
    });
    /*********************************************************
    * unmapped properties are not persisted
    *********************************************************/
    test("unmapped properties are not persisted", 9, function () {

        var store = cloneModuleMetadataStore();
        
        var TodoItemCtor = function () {
            this.foo = 0;
        };
        store.registerEntityTypeCtor("TodoItem", TodoItemCtor);
        
        var todoType = store.getEntityType("TodoItem");
        var fooProp = todoType.getProperty('foo');
        ok(fooProp && fooProp.isUnmapped,
            "'foo' should be an unmapped property after registration");

        // Create manager that uses this extended TodoItem
        var manager = new EntityManager({
            serviceName: todoService,
            metadataStore: store
        });

        // Add new Todo
        var todo = manager.createEntity(todoType.name);
        var operation, description; // testing capture vars

        stop(); // going async

        saveAddedTodo()
            .then(saveModifiedTodo)
            .then(saveDeletedTodo)
            .fail(handleFail)
            .fin(start);

        function saveAddedTodo() {
            changeDescription("add");
            todo.foo(42);
            return manager.saveChanges().then(saveSucceeded);
        }
        function saveModifiedTodo() {
            changeDescription("update");
            todo.foo(84);
            return manager.saveChanges().then(saveSucceeded);
        }
        function saveDeletedTodo() {
            changeDescription("delete");
            todo.foo(21);
            todo.entityAspect.setDeleted();
            return manager.saveChanges().then(saveSucceeded);
        }

        function changeDescription(op) {
            operation = op;
            description = op + " entityExtensionTest";
            todo.Description(description);
        }
        function saveSucceeded(saveResult) {

            notEqual(todo.foo(), 0, "'foo' retains its '{0}' value after '{1}' save succeeded but ..."
                .format(todo.foo(), operation));

            // clear the cache and requery the Todo
            manager.clear();
            return EntityQuery.fromEntities(todo).using(manager).execute().then(requerySucceeded);

        }
        function requerySucceeded(data) {
            if (data.results.length === 0) {
                if (operation === "delete") {
                    ok(true, "todo should be gone from the database after 'delete' save succeeds.");
                }else {
                    ok(false, "todo should still be in the database after '{0}' save.".format(operation));
                }
                return;
            }

            todo = data.results[0];
            equal(todo.foo(), 0, "'foo' should have reverted to '0' after cache-clear and re-query.");
            equal(todo.Description(), description,
                    "'Description' should be '{0}' after {1} succeeded and re-query".format(description, operation));
        }
    });

    /*********************************************************
    * unmapped property can be set by server class calculated property
    *********************************************************/
    test("unmapped property can be set by a calculated property of the server class", 4, function () {

        var store1 = cloneModuleMetadataStore();

        var store2 = cloneModuleMetadataStore();
        var employeeCtor = function () {
            //'Fullname' is a server-side calculated property of the Employee class
            // This unmapped property will be empty for new entities
            // but will be set for existing entities during query materialization
            this.FullName = ""; 
        };
        store2.registerEntityTypeCtor("Employee", employeeCtor);


        var em1 = newEm(store1); // no unmapped properties registered
        var prop = em1.metadataStore.getEntityType('Employee').getProperty('FullName');
        ok(!prop,
            "'FullName' should NOT be a registered property of 'em1'.");

        var em2 = newEm(store2);
        prop = em2.metadataStore.getEntityType('Employee').getProperty('FullName');
        ok(prop && prop.isUnmapped,
            "'FullName' should be an unmapped property in 'em2'");
        
        var query = EntityQuery.from('Employees');
        var p1 = em1.executeQuery(query).then(success1);
        var p2 = em2.executeQuery(query).then(success2);

        stop(); // going async

        Q.all([p1, p2]).fail(handleFail).fin(start);
        
        function success1(data) {
            var first = data.results[0];
            var fullProperty = first.FullName;
            ok(!fullProperty, "an Employee queried with 'em1' should NOT have a 'FullName' property, let alone a value for it");
        }
        
        function success2(data) {
            var first = data.results[0];
            var full = first.FullName();
            ok(full, "an Employee queried with 'em2' should have a calculated FullName ('Last, First'); it is '{0}'"
                .format(full));
        }

    });
    /*********************************************************
    * add instance function via constructor
    *********************************************************/
    test("add instance function via constructor", 3, function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () {
            this.foo = function () { return 42;};
        };

        store.registerEntityTypeCtor("Customer", Customer);

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
    test("add mapped data property via constructor", 7, function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () {
            this.CompanyName = "Acme"; // a field, not a KO property
            this.ContactName = ko.observable("Amy"); // is a KO property
        };

        store.registerEntityTypeCtor("Customer", Customer);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        ok(cust["CompanyName"],
            "should have 'CompanyName' property via constructor");

        // 'CompanyName' is a mapped data property
        var propInfo = customerType.getProperty("CompanyName");
        ok(propInfo !== null,
            "'CompanyName' should be known to the customer type");
        ok(propInfo && !propInfo.isUnmapped,
            "'CompanyName' should be a mapped property");
        
        // Although defined as a field, Breeze made it a KO property and initialized it
        equal(cust.CompanyName(), "Acme",
            "'CompanyName' should be a KO 'property' returning 'Acme'");

        // Breeze preserved the ContactName KO property as a mapped data property
        propInfo = customerType.getProperty("ContactName");
        ok(propInfo !== null,
            "'ContactName' should be known to the customer type");
        ok(propInfo && !propInfo.isUnmapped,
            "'ContactName' should be a mapped property");
        equal(cust.ContactName(), "Amy",
            "'ContactName' should be a KO 'property' returning 'Amy'");
    });
    /*********************************************************
    * add method to prototype via constructor
    *********************************************************/
    test("add method to prototype via constructor", 2, function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () { };
        
        Customer.prototype.sayHi = function () {
            return "Hi, my name is {0}!".format(this.CompanyName());
        };
        
        store.registerEntityTypeCtor("Customer", Customer);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();
        cust.CompanyName("Acme");

        ok(cust["sayHi"],
            "should have 'sayHi' member via constructor");

        var expected = "Hi, my name is Acme!";
        equal(cust.sayHi(), expected,
            "'sayHi' function should return expected message, '{0}'."
                .format(expected));
    });

    /*********************************************************
    * knockout computed property via constructor
    *********************************************************/
    test("add knockout computed property via constructor", 2, function () {
        var store = cloneModuleMetadataStore();

        var Employee = function () {
            this.fullName = ko.computed(
                {
                    read: function () {
                        return this.FirstName() + " " + this.LastName();
                    },
                    // required because FirstName and LastName not yet defined
                    deferEvaluation: true 
                }, this);
        };

        store.registerEntityTypeCtor("Employee", Employee);

        var employeeType = store.getEntityType("Employee");
        var emp = employeeType.createEntity();
        emp.FirstName("John");
        emp.LastName("Doe");

        ok(emp["fullName"],
            "should have 'fullName' member via constructor");

        var expected = "John Doe";
        equal(emp.fullName(), expected,
            "'fullName' KO computed should return , '{0}'."
                .format(expected));
    });
    /*********************************************************
    * knockout computed property based on collection navigation via constructor
    *********************************************************/
    test("add knockout computed property based on collection navigation via constructor", 2,
        function () {
        var store = cloneModuleMetadataStore();

        var Employee = function () {
            this.orderCount = ko.computed(
                {
                    read: function () {
                        return this.Orders().length;
                    },
                    // Orders not defined yet
                    deferEvaluation: true
                }, this);
        };

        store.registerEntityTypeCtor("Employee", Employee);

        var employeeType = store.getEntityType("Employee");
        var emp = employeeType.createEntity();

        equal(emp.orderCount(),0,
            "should have a zero orderCount");

        var orderType = store.getEntityType("Order");
        var newOrder = orderType.createEntity();
        emp.Orders.push(newOrder);
            
        equal(emp.orderCount(), 1,
            "orderCount should be 1 after pushing newOrder");
        });
   /*********************************************************
   * knockout computed property w/ re-defined mapped dependent properties
   *********************************************************/
    test("add knockout computed property w/ re-defined mapped dependent properties", 3,
        function () {
            var store = cloneModuleMetadataStore();

            var Employee = function () {
                this.FirstName = ko.observable(""); // default FirstName
                this.LastName = ko.observable("");  // default LastName
                this.fullName = ko.computed(
                        function () {
                            return this.FirstName() + " " + this.LastName();
                        }, this);
            };

            store.registerEntityTypeCtor("Employee", Employee);

            var employeeType = store.getEntityType("Employee");
            var emp = employeeType.createEntity();
            emp.FirstName("John");
            emp.LastName("Doe");

            ok(emp["fullName"],
                "should have 'fullName' member via constructor");

            var expected = "John Doe";
            equal(emp.fullName(), expected,
                "created 'emp.fullName' KO computed should return , '{0}'."
                    .format(expected));

            // Now show it works for materialized query entity
            var query = breeze.EntityQuery.from("Employees").top(1);
            var em = newEm(store);

            stop(); // going async
            em.executeQuery(query)
            .then(function (data) {
                var emp2 = data.results[0];
                var expected2 = emp2.FirstName() + " " + emp2.LastName();
                equal(emp2.fullName(), expected2,
                    "materialized 'emp2.fullName' KO computed should return , '{0}'."
                        .format(expected2));
            })
            .fail(handleFail)
            .fin(start);
    });
    /*********************************************************
    * add subscription in post-construction initializer
    *********************************************************/
    test("add subscription in post-construction initializer", 1, function () {
        var store = cloneModuleMetadataStore();

        var Customer = function () {};

        var companyNameNotificationCount = 0;
        var customerInitializer = function(customer) {
            customer.CompanyName.subscribe(
                function (newValue) {
                    companyNameNotificationCount += 1;
            });
        };
        
        store.registerEntityTypeCtor("Customer", Customer, customerInitializer);

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

        var Customer = function () { };

        var customerInitializer = function (customer) {
            customer.foo = "Foo " + customer.CompanyName();
        };

        store.registerEntityTypeCtor("Customer", Customer, customerInitializer);

        var customerType = store.getEntityType("Customer");
        var cust = customerType.createEntity();

        equal(cust.foo, "Foo ",
            "'foo' property, created in initializer, should return 'Foo");
        
        var propInfo = customerType.getProperty("foo");
        // The Breeze customerType knows nothing about it.
        ok(propInfo === null, "'foo' should be unknown to the customer type");

    });
    /*********************************************************
    * knockout computed property based on collection navigation via initializer
    *********************************************************/
    test("add knockout computed property based on collection navigation via initializer", 2,
        function () {
            var store = cloneModuleMetadataStore();

            var employeeInitializer = function (employee) {
                employee.orderCount = ko.computed(
                    {
                        read: function () {
                            return employee.Orders().length;
                        },
                        // Orders not defined yet
                        deferEvaluation: true
                    });
            };

            store.registerEntityTypeCtor("Employee", function (){}, employeeInitializer);

            var employeeType = store.getEntityType("Employee");
            var emp = employeeType.createEntity();

            equal(emp.orderCount(), 0,
                "should have a zero orderCount");

            var orderType = store.getEntityType("Order");
            var newOrder = orderType.createEntity();
            emp.Orders.push(newOrder);

            equal(emp.orderCount(), 1,
                "orderCount should be 1 after pushing newOrder");
        });
    /*********************************************************
    * initializer called by importEntities
    *********************************************************/
    test("initializer called by importEntities", 5, function () {
        
        // ARRANGE
        // Start with clean metadataStore copy; no registrations
        var store = cloneModuleMetadataStore();

        // define and register employee initializer
        var employeeInitializer = function (employee) {
            employee.foo = "Foo " + employee.LastName();
            employee.fooComputed = ko.computed(function() {
                return "Foo " + employee.LastName();
            }, this);
        };
        store.registerEntityTypeCtor("Employee", null, employeeFooInitializer);

        // define manager using prepared test store
        var em1 = new breeze.EntityManager({
            serviceName: northwindService,
            metadataStore: store
        });
        
        var emp = createEmployee42();
        em1.attachEntity(emp);
        var exportData = em1.exportEntities();

        /* Create em2 with with registration only
        * expecting metadata from import to fill in the entityType gaps
        * Emulate launching a disconnected app
        * and loading data from local browser storage */

        var em2 = new breeze.EntityManager(northwindService);
        em2.metadataStore.registerEntityTypeCtor("Employee", null, employeeFooInitializer);
        
        /* Create em2 with copy constructor
        * In this path, em2 all entityType metadata + registration
        * Not realistic. */
        
        //var em2 = em1.createEmptyCopy(); // has ALL metadata
        
        // ACTION
        em2.importEntities(exportData);
        
        // ASSERT
        var emp2 = em2.findEntityByKey(emp.entityAspect.getKey());

        ok(emp2 !== null, "should find imported 'emp' in em2");
        ok(emp2 && emp2.foo,
            "emp from em2 should have 'foo' property from initializer");
        equal(emp2 && emp2.foo, "Foo Test",
           "emp from em2 should have expected foo value");
        ok(emp2 && emp2.fooComputed,
          "emp from em2 should have 'fooComputed' observable from initializer");
        equal(emp2 && emp2.fooComputed && emp2.fooComputed(), "Foo Test",
           "emp from em2 should have expected fooComputed value");
        
        function createEmployee42() {
            var employeeType = store.getEntityType("Employee");
            var employee = employeeType.createEntity();
            employee.EmployeeID(42);
            employee.LastName("Test");
            return employee;
        }
    });
    function employeeFooInitializer (employee) {
        employee.foo = "Foo " + employee.LastName();
        employee.fooComputed = ko.computed(function () {
            return "Foo " + employee.LastName();
        }, this);
    };

    /*********************************************************
    * Can create employee after registering addhasValidationErrorsProperty initializer
    *********************************************************/
    test("Can create employee after registering addhasValidationErrorsProperty initializer", 8,
        function () {
            var hasValidationErrorsRaised;
            var store = cloneModuleMetadataStore();

            store.registerEntityTypeCtor("Employee", function () { }, addhasValidationErrorsProperty);

            var employeeType = store.getEntityType("Employee");
            equal(employeeType.autoGeneratedKeyType, breeze.AutoGeneratedKeyType.Identity,
                "'employeeType' should have identity key");

            var emp = employeeType.createEntity();           
            equal(emp.EmployeeID(), 0,
                "new emp should have id===0 before adding to manager");

            ok(emp.hasValidationErrors,
                "new emp should have the 'hasValidationErrors' observable");

            if (emp.hasValidationErrors) {
                emp.hasValidationErrors.subscribe(function () {
                    hasValidationErrorsRaised = true;
                });
            }

            ok(emp.hasValidationErrors && !emp.hasValidationErrors(),
                "'hasValidationErrors' should be false before adding to manager.");
            
            var manager = new breeze.EntityManager({
                serviceName: northwindService,
                metadataStore: store
            });
            manager.addEntity(emp);
            
            ok(emp.EmployeeID() < 0,
                "new emp should have temp id <0 after adding to manager; is " + emp.EmployeeID());

            // A manager's default validationOptions are set to validate the entity
            // when it is attached (added) to the manager
            ok(emp.hasValidationErrors && emp.hasValidationErrors(),
                "'hasValidationErrors' should be true after adding to manager.");
            
            ok(hasValidationErrorsRaised,
                "'hasValidationErrors' observable raised a notification");

            ok(true, "Validation messages are: "+ testFns.getValidationErrMsgs(emp));
        });
    
    // Initializer that adds hasValidationErrors observable property
    // to any entity. This observable notifies when validation errors change
    function addhasValidationErrorsProperty(entity) {

        var prop = ko.observable(false);

        var onChange = function () {
            var hasError = entity.entityAspect.getValidationErrors().length > 0;
            if (prop() === hasError) {
                // collection changed even though entity net error state is unchanged
                prop.valueHasMutated(); // force notification
            } else {
                prop(hasError); // change the value and notify
            }
        };

        onChange();             // check now ...
        entity.entityAspect // ... and when errors collection changes
            .validationErrorsChanged.subscribe(onChange);

        // observable property is wired up; now add it to the entity
        entity.hasValidationErrors = prop;
    }
    /*********************************************************
    * queried entity has new property from post-construction initializer
    *********************************************************/
    test("queried entity has new property from post-construction initializer", 1,
        function () {
            var store = cloneModuleMetadataStore();

            var Customer = function () { };

            var customerInitializer = function (customer) {
                customer.foo = "Foo " + customer.CompanyName();
            };

            store.registerEntityTypeCtor("Customer", Customer, customerInitializer);
        
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
    * unmapped property (and only unmapped property) preserved
    * after export/import
    *********************************************************/
    test("unmapped property preserved after export/import", 3,
        function () {
            var store = cloneModuleMetadataStore();

            var Customer = function () {
                this.unmappedProperty = "";
            };

            var customerInitializer = function (customer) {
                customer.initializerProperty =
                    customer.foo || "new initializerProperty";
            };

            store.registerEntityTypeCtor("Customer", Customer, customerInitializer);

            // create EntityManager with extended metadataStore
            var em1 = newEm(store);

            // create a new customer defined by that extended metadata
            var cust1 = em1.createEntity('Customer', {CustomerID: testFns.newGuidComb()});

            // Set the 'properties' we added
            cust1.unmappedProperty("Hi, I'm unmapped");
            cust1.initializerProperty = "Hi, I'm the initializerProperty";
            cust1.adHocProperty = 42; // can always add another property; it's JavaScript

            var exportData = em1.exportEntities();

            var em2 = newEm(store);
            em2.importEntities(exportData);
            var cust2 = em2.getEntities()[0];

            // Only cust2.unmappedProperty should be preserved
            equal(cust2.unmappedProperty(), "Hi, I'm unmapped",
                "cust2.unmappedProperty's value should be restored after import");
            equal(cust2.initializerProperty, "new initializerProperty",
                "cust2.initializerProperty's value should NOT be restored after import; it is '{0}' "
                .format(cust2.initializerProperty));
            ok(typeof cust2.adHocProperty === "undefined",
                "cust2.adHocProperty should be undefined");

        });

    /*********************************************************
    * createEntity sequence is ctor, init-vals, init-er, add
    *********************************************************/
    test("createEntity sequence is ctor, init-vals, init-er, add", 1,
        function () {
            /* Arrange */
            var expected = {
                ctor: "constructor",
                initVals: "initialValues",
                initer: "initializer",
                attach: "added to manager"
            };
            var actual = [];
            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor(
                'Customer',
                function () { // ctor
                    actual.push(expected.ctor);
                    this.initialValue = ko.observable("");
                    // will assign with initial values hash
                    this.initialValue.subscribe(function() {
                        actual.push(expected.initVals);
                    });
                },
                function () {
                    actual.push(expected.initer);
                });
            actual = []; // reset after registration
            
            var em = newEm(store);
            em.entityChanged.subscribe(function (args) {
                if (args.entityAction === breeze.EntityAction.Attach) {
                    actual.push(expected.attach);
                }
            });
            
            /* ACT */
            var cust = em.createEntity('Customer', {
                CustomerID: testFns.newGuidComb(),
                initialValue: expected[1]
            });
            
            /* ASSERT */
            var exp = [];
            for (var prop in expected) { exp.push(expected[prop]);}
            deepEqual(actual, exp,
                "Call sequence should be: "+exp.join(", "));
        });

    /*********************************************************
    * query sequence is ctor, init-er, merge
    *********************************************************/
    test("query entity sequence is ctor, init-er, merge", 1,
        function () {
            /* Arrange */
            var expected = {
                ctor: "constructor",
                initer: "initializer",
                attach: "merge"
            };
            var actual = [];
            var store = cloneModuleMetadataStore();
            store.registerEntityTypeCtor(
                'Customer',
                function () { // ctor
                    actual.push(expected.ctor);
                },
                function () {
                    actual.push(expected.initer);
                });
            actual = []; // reset after registration

            var em = newEm(store);
            em.entityChanged.subscribe(function (args) {
                if (args.entityAction === breeze.EntityAction.AttachOnQuery) {
                    actual.push(expected.attach);
                }
            });

            /* ACT */
            stop();
            EntityQuery
                .from('Customers').take(1)
                .using(em).execute()
                .then(success).fail(handleFail).fin(start);

            /* ASSERT */
            function success() {
                var exp = [];
                for (var prop in expected) { exp.push(expected[prop]); }
                deepEqual(actual, exp,
                    "Call sequence should be: " + exp.join(", "));
            }
        });
    /*********************************************************
    * can define custom temporary key generator
    * must conform to the keygenerator-interface
    * http://www.breezejs.com/sites/all/apidocs/classes/~keyGenerator-interface.html
    *********************************************************/
    test("can define custom temporary key generator", 3,
        function () {
            var em = newEm();

            // add statics for testing the key generator
            var tempIds = testKeyGenerator.tempIds = [];

            em.setProperties({ keyGeneratorCtor: testKeyGenerator });

            // Order has an integer key.
            // temporary keys are assigned when added to an EntityManager
            var o1 = em.createEntity('Order');
            var o2 = em.createEntity('Order');

            // Customer has a client-assigned Guid key
            // A new Customer does not add its key to the tempIds
            em.createEntity('Customer',{CustomerID: testFns.newGuidComb()});

            equal(tempIds.length, 2, "should have 2 tempIds");
            equal(o1.OrderID(), tempIds[0], "o1 should have temp key " + tempIds[0]);
            equal(o2.OrderID(), tempIds[1], "o2 should have temp key " + tempIds[1]);

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

            if (dataType === breeze.DataType.Guid) {
                return breeze.core.getUuid();
            }

            throw new Error("Cannot generate key for a property of datatype: " +
                dataType.toString());
        }
    }
    
    /*********************************************************
    * If a store-generated key and the key value is the default value
    * the default value is replaced by client-side temporary key generator
    *********************************************************/
    test("store-gen keys w/ default values are re-set by key generator upon add to manager", 2,
        function () {
            var em = newEm();

            var o1 = em.createEntity('Order');
            var o1Id = o1.OrderID();
            ok(o1Id !== 0,
                "o1's default key should be replaced w/ new temp key; it is " + o1Id);

            var orderEntityType = em.metadataStore.getEntityType("Order");
            var o2 = orderEntityType.createEntity();
            o2.OrderID(42); // set to other than default value (0 for ints)
            em.addEntity(o2); // now add to the manager

            equal(o2.OrderID(), 42,
                "o2's key, 42, should not be replaced w/ new temp key when added.");
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
    function newEm(metadataStore) {
        return new EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || moduleMetadataStore
        });
    }
})(docCode.testFns);