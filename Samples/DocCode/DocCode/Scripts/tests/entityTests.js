// ReSharper disable InconsistentNaming
define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("entityTests", testFns.getModuleOptions(newEm));

    /*********************************************************
    * Add a customer and confirm its EntityState
    *********************************************************/
    test("add customer", 1, function () {

        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var newCust = customerType.createEntity();
        em.addEntity(newCust);

        ok(newCust.entityAspect.entityState.isAdded(), "newCust should be 'added'");
    });

    /*********************************************************
    * entityAspect.rejectChanges of added entity detaches it
    *********************************************************/

    test("rejectChanges of added entity detaches it", function () {
        var em = newEm();

        var typeInfo = em.metadataStore.getEntityType("Order");
        var newEntity = typeInfo.createEntity();
        em.addEntity(newEntity);

        var entityState = newEntity.entityAspect.entityState;
        ok(entityState.isAdded(),
            "newEntity should be in Added state; is " + entityState);

        newEntity.entityAspect.rejectChanges();

        entityState = newEntity.entityAspect.entityState;
        ok(entityState.isDetached(),
            "newEntity should be Detached after rejectChanges; is " + entityState);

        ok(!em.hasChanges(), "should not have changes");

        var inCache = em.getEntities(), count = inCache.length;
        ok(count == 0, "should have no entities in cache; have " + count);

    });
    /*********************************************************
    * local query does not return added entity after rejectChanges
    *********************************************************/

    test("local query does not return added entity after rejectChanges", 2, function () {
        var em = newEm();

        var typeInfo = em.metadataStore.getEntityType("Order");
        var newEntity = typeInfo.createEntity();
        em.addEntity(newEntity);

        newEntity.entityAspect.rejectChanges();
        var entityState = newEntity.entityAspect.entityState;
        ok(entityState.isDetached(),
            "state of newEntity, after rejectChanges should be Detached; is " + entityState);

        var orders = em.executeQueryLocally(breeze.EntityQuery.from("Orders"));
        equal(orders.length, 0,
            "Local query should return no orders");
    });
    
    /*********************************************************
    * can find deleted entity in cache with getEntities()
    *********************************************************/

    test("find deleted entity in cache with getEntities()", 1, function () {

        var em = newEm();
        var customer = getFakeDeletedcustomer(em);

        // get the first (and only) entity in cache
        var customerInCache = em.getEntities()[0];

        equal(customerInCache, customer,
            "customer in cache is the one we deleted");

    });

    /*********************************************************
    * can find deleted entity in cache by key
    *********************************************************/

    test("find deleted entity in cache by key", 1, function () {

        var em = newEm();
        var customer = getFakeDeletedcustomer(em);

        var customerType = em.metadataStore.getEntityType("Customer");
        var key = new breeze.EntityKey(customerType, customer.CustomerID());

        var foundcustomer = em.findEntityByKey(key);
        ok(foundcustomer !== null,
            "found deleted customer in cache with 'findEntityByKey'");

    });

    /*********************************************************
    * does not return deleted entity in cache when queryLocally
    *********************************************************/

    test("does not return deleted entity in cache when queryLocally", 1, function () {

        var em = newEm();
        var customer = getFakeDeletedcustomer(em);

        var customerQuery = breeze.EntityQuery.fromEntities(customer);
        var queryResults = em.executeQueryLocally(customerQuery);

        if (queryResults.length === 0) {
            ok(true, "query for deleted customer in cache returned none");
        } else {
            var queriedcustomer = queryResults[0];
            ok(false,
                "query unexpectedly returned customer '{0}' in state={1}"
                    .format(queriedcustomer.CompanyName(), 
                        queriedcustomer.entityAspect.entityState));
        }

    });

    /*********************************************************
    * original values are tracked after attached
    *********************************************************/
    test("original values are tracked after entity is attached", 5, function () {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity(); // created but not attached
        employee.LastName("Smith"); // initial value before attached
        employee.LastName("Jones"); // change value before attaching 

        var origValuePropNames = getOriginalValuesPropertyNames(employee);
        equal(origValuePropNames.length, 0,
            "No original values tracked for detached entity.");
        
        // Attach as "Unchanged". 
        em.attachEntity(employee);

        employee.LastName("Black"); // should be tracking original value

        var originalValuesLastName = employee.entityAspect.originalValues.LastName;
        ok(originalValuesLastName === "Jones",
            "New LastName is '{0}', original value is '{1}' "
                .format(employee.LastName(), originalValuesLastName));
        
        employee.entityAspect.rejectChanges(); //reverts to original values
        //em.rejectChanges(); // this works too ... for all changed entities in cache

        ok(employee.entityAspect.entityState.isUnchanged(),
            'employee should be "Unchanged" after calling rejectChanges');
        
        equal(employee.LastName(), originalValuesLastName,
            "LastName should be restored to " + originalValuesLastName);

        equal(origValuePropNames.length, 0,
            "After rejectChanges, 'entityAspect.originalValues' should be empty; it is: " +
            origValuePropNames.toString());
    });
    /*********************************************************
    * originalValues is a new object after the entity returns to Unchanged state
    *********************************************************/
    test("entityAspect.originalValues is a new object after the entity returns to Unchanged state", 3,
        function () {

            var em = newEm(); // new empty EntityManager
            var empType = em.metadataStore.getEntityType("Employee");

            var employee = empType.createEntity(); 
            employee.LastName("Jones");
            em.attachEntity(employee);// Attach as "Unchanged". 
            employee.LastName("Black"); // should be tracking original value

            var originalValues1 = employee.entityAspect.originalValues;
            
            employee.entityAspect.rejectChanges();

            ok(employee.entityAspect.entityState.isUnchanged(),
                'employee should be "Unchanged" after calling rejectChanges');

            var originalValues2 = employee.entityAspect.originalValues;
            
            notStrictEqual(originalValues1, originalValues2,
                "entityAspect.originalValues is a new object after rejectChanges");

            equal(originalValues1.LastName, "Jones",
                "The 'original' LastName, 'Jones', should still be on the first originalValues object.");
        });
   /*********************************************************
   * Setting an entity property value to itself doesn't trigger entityState change
   *********************************************************/
    test("Setting an entity property value to itself doesn't trigger entityState change", 1,
        function () {
            var em = newEm();

            var employeeType = em.metadataStore.getEntityType("Employee");
            var employee = employeeType.createEntity();
            employee.EmployeeID(1);
            em.attachEntity(employee);

            employee.FirstName(employee.FirstName());

            var entityState = employee.entityAspect.entityState;
            ok(entityState.isUnchanged(),
                "employee should be Unchanged; is " + entityState);
        });
    /*********************************************************
    * manager.rejectChanges undoes a bi-directional navigation property change 
    * Considers an association in which navigation properties exist 
    * in both directions (order -> employee, employee -> orders
    *********************************************************/
    test("manager.rejectChanges undoes a bi-directional navigation property change", 4,
        function () {
            var em = newEm();

            var employeeType = em.metadataStore.getEntityType("Employee");
            var employee1 = employeeType.createEntity();
            employee1.EmployeeID(1);
            em.attachEntity(employee1);
        
            var employee2 = employeeType.createEntity();
            employee2.EmployeeID(2);
            em.attachEntity(employee2);
        
            var orderType = em.metadataStore.getEntityType("Order");     
            var order = orderType.createEntity();
            order.EmployeeID(42);
            order.Employee(employee1);// pulls order into Employee's manager
            order.entityAspect.setUnchanged();

            order.Employee(employee2);
            var entityState = order.entityAspect.entityState;
            ok(entityState.isModified(),
                "order should be in Modified state; is " + entityState);

            em.rejectChanges();

            ok(!em.hasChanges(), "manager should not have changes");
        
            entityState = order.entityAspect.entityState;
            ok(entityState.isUnchanged(),
                "order should be Unchanged after rejectChanges; is " + entityState);
            ok(order.Employee() === employee1,
                "order.Employee should be employee1 after rejectChanges; is " + 
                    order.Employee().EmployeeID()
            );
    });
    /*********************************************************
    * manager.rejectChanges undoes a uni-directional navigation property change 
    * Considers an association in which only the dependent (scalar) navigation property exists 
    * (orderDetail -> product but no use for product -> orderDetails
    * Check the Product type in NorthwindModel to confirm that Product.OrderDetails doesn't exist
    * If you need that information, use a query.
    *********************************************************/
    test("manager.rejectChanges undoes a uni-directional navigation property change", 5,
        function () {
            var em = newEm();

            var productType = em.metadataStore.getEntityType("Product");
            
            var odProperty = productType.getProperty("OrderDetails");
            ok(odProperty === null,
                "Product should not have an OrderDetails navigation property");

            var product1 = productType.createEntity();
            product1.ProductID(1);
            em.attachEntity(product1);

            var product2 = productType.createEntity();
            product2.ProductID(2);
            em.attachEntity(product2);

            var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
            var orderDetail = orderDetailType.createEntity();
            orderDetail.OrderID(42);
            orderDetail.Product(product1); // pulls orderDetail into Product's manager
            
            orderDetail.entityAspect.setUnchanged();

            orderDetail.Product(product2);
            var entityState = orderDetail.entityAspect.entityState;
            ok(entityState.isModified(),
                "orderDetail should be in Modified state; is " + entityState);

            em.rejectChanges();

            ok(!em.hasChanges(), "manager should not have changes");

            entityState = orderDetail.entityAspect.entityState;
            ok(entityState.isUnchanged(),
                "orderDetail should be Unchanged after rejectChanges; is " + entityState);
            ok(orderDetail.Product() === product1,
                "orderDetail.Product should be product1 after rejectChanges; is " +
                    orderDetail.Product().ProductID()
            );
        });
    /*********************************************************
    * rejectChanges of a child entity restores it to its parent
    *********************************************************/
    test("rejectChanges of a child entity restores it to its parent", 8,
        function() {
            var em = newEm();
            
            var orderType = em.metadataStore.getEntityType("Order");
            var parent = orderType.createEntity();
            parent.OrderID(1);
            em.attachEntity(parent);

            var orderDetailType = em.metadataStore.getEntityType("OrderDetail");
            var child = orderDetailType.createEntity();
            child.OrderID(42);
            child.Order(parent); // adds child to parent's manager
            child.entityAspect.setUnchanged();
            
            // parent and child are now unchanged ... as if freshly queried
            ok(!em.hasChanges(),
                "manager should not have unsaved changes before delete");

            child.entityAspect.setDeleted();
            
            equal(parent.OrderID(), child.OrderID(),
                "child's still has parent's FK Id after delete");
            ok(null === child.Order(), // Deleted child no longer has a parent
                "deleted child cannot navigate to former parent after delete");
            equal(parent.OrderDetails().length, 0,
                "parent no longer has the chile after child delete");

            em.rejectChanges();
            
            ok(!em.hasChanges(),
               "manager should not have unsaved changes after rejectChanges");
            equal(parent.OrderID(), child.OrderID(),
                "child's still has parent's FK Id after rejectChanges");
            ok(parent === child.Order(), 
                "child can navigate to parent after rejectChanges");
            ok(parent.OrderDetails()[0] === child,
                "parent has child after rejectChanges");
        }
    );

    /*********************************************************
    * setUnchanged() does not restore property values
    * but it does clear the originalValues hash
    *********************************************************/
    test("setUnchanged() does not restore property values", 4, function () {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity();
        employee.LastName("Jones");

        em.attachEntity(employee); // attach as Unchanged

        var changedName = "Black";
        employee.LastName(changedName);

        var originalValuesLastName = employee.entityAspect.originalValues.LastName;
        ok(originalValuesLastName === "Jones",
            "New LastName is '{0}', original value is '{1}' "
                .format(employee.LastName(), originalValuesLastName));

        //changes entityState but doesn't revert to original values
        employee.entityAspect.setUnchanged();

        ok(employee.entityAspect.entityState.isUnchanged(),
            'employee should be "Unchanged" after calling setUnchanged()');

        equal(employee.LastName(), changedName,
            "But LastName should still be " + changedName);

        var origValuePropNames = getOriginalValuesPropertyNames(employee);

        equal(origValuePropNames.length, 0,
            "After setUnchanged(), 'entityAspect.originalValues' should be empty; it is: " +
            origValuePropNames.toString());
    });
    /*********************************************************
    * entityState is Unchanged after calling acceptChanges on added entity
    * Beware of acceptChanges; it makes an entity look like it was saved
    * Beware of the key, especially if the key should have been store generated
    *********************************************************/
    test("entityState is Unchanged after calling acceptChanges on added entity", 2,
        function () {

            var em = newEm(); // new empty EntityManager
            var empType = em.metadataStore.getEntityType("Employee");

            var employee = empType.createEntity(); // created but not attached

            em.addEntity(employee);
            var tempId = employee.EmployeeID(); // tempId assigned by Breeze

            employee.entityAspect.acceptChanges();
            //em.acceptChanges(); // this works too ... for all changed entities in cache
            ok(employee.entityAspect.entityState.isUnchanged(),
                'employee should be "Unchanged" after calling acceptChanges');
        
            equal(employee.EmployeeID(), tempId,
                'employeeID should still be the tempId, ' + tempId +
                    ', a dubious choice.');
        });
    /*********************************************************
    * entityState is Unchanged after calling acceptChanges on modified entity
    * Beware of acceptChanges; it makes an entity look like it was saved
    *********************************************************/
    test("entityState is Unchanged after calling acceptChanges on modified entity", 4,
    function () {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity(); // created but not attached
        employee.EmployeeID(42);
        employee.FirstName("Sally");
        em.attachEntity(employee); // simulate existing employee

        var changedFirstName = "Bob";
        employee.FirstName(changedFirstName);

        var originalValuesFirstName = employee.entityAspect.originalValues.FirstName;
        ok(originalValuesFirstName === "Sally",
            "New FirstName is '{0}', original value is '{1}' "
                .format(employee.FirstName(), originalValuesFirstName));
        
        employee.entityAspect.acceptChanges(); // simulate post-save state
        //em.acceptChanges(); // this works too ... for all changed entities in cache

        ok(employee.entityAspect.entityState.isUnchanged(),
            'employee should be "Unchanged" after calling acceptChanges');

        equal(employee.FirstName(), changedFirstName,
            "FirstName should be the changed name, " + changedFirstName);
        
        var origValuePropNames = getOriginalValuesPropertyNames(employee);
        
        equal(origValuePropNames.length, 0,
            "After acceptChanges, 'entityAspect.originalValues' should be empty; it is: "+
            origValuePropNames.toString());

    });
    /*********************************************************
    * entityState is Detached after calling acceptChanges on deleted entity
    * Beware of acceptChanges; it makes an entity look like it was saved
    *********************************************************/
    test("entityState is Detached after calling acceptChanges on deleted entity", 1,
    function () {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity(); // created but not attached
        employee.EmployeeID(42);
        em.attachEntity(employee); // simulate existing employee

        employee.entityAspect.setDeleted();
        employee.entityAspect.acceptChanges(); // simulate post-save state
        //em.acceptChanges(); // this works too ... for all changed entities in cache

        ok(employee.entityAspect.entityState.isDetached(),
            'employee should be "Detached" after calling acceptChanges');
    });
    /*********************************************************
     * changing a property raises propertyChanged 
     *********************************************************/
    test("changing a property raises propertyChanged", 5,
        function () {

            var em = newEm(); // new empty EntityManager
            var empType = em.metadataStore.getEntityType("Employee");

            var employee = empType.createEntity();
            employee.LastName("Jones");
                     
            em.addEntity(employee); // attaching as unchanged would be ok too
            
            // get ready for propertyChanged event after property change
            var propertyChangedArgs;
            employee.entityAspect.propertyChanged.subscribe(function (changeArgs) {
                propertyChangedArgs = changeArgs;
            });
            employee.LastName("Black"); 

            notEqual(propertyChangedArgs, null,
                "LastName change should have raised the propertyChanged event");
            equal(propertyChangedArgs.entity, employee,
                "the changeArgs.entity should be the expected employee");
            equal(propertyChangedArgs.propertyName, "LastName",
                "the changeArgs.propertyName should be 'LastName'");
            equal(propertyChangedArgs.oldValue, "Jones",
                "the changeArgs oldValue should be 'Jones'");
            equal(propertyChangedArgs.newValue, "Black",
                "the changeArgs newValue should be 'Black'");
        });
    /*********************************************************
    * rejectChanges raises propertyChanged with null changeArgs
    *********************************************************/
    test("rejectChanges raises propertyChanged with null changeArgs", 5,
        function () {

            var em = newEm(); // new empty EntityManager
            var empType = em.metadataStore.getEntityType("Employee");

            var employee = empType.createEntity();
            employee.LastName("Jones");
            em.attachEntity(employee);// Attach as "Unchanged". 
            employee.LastName("Black"); // should be tracking original value

            // Hold onto propertyNames that changed before calling rejectChanges
            var origValuePropNames = getOriginalValuesPropertyNames(employee);

            // get ready for propertyChanged event after rejectChanges()
            var propertyChangedArgs;
            employee.entityAspect.propertyChanged.subscribe(function (changeArgs) {
                propertyChangedArgs = changeArgs;
            });
            employee.entityAspect.rejectChanges();

            notEqual(propertyChangedArgs, null,
                "rejectChanges should have raised the propertyChanged event");
            equal(propertyChangedArgs.entity, employee,
                "the changeArgs.entity should be the expected employee");
            equal(propertyChangedArgs.propertyName, null,
                "the changeArgs.propertyName should be null");
            ok(propertyChangedArgs.oldValue === undefined &&
                propertyChangedArgs.newValue === undefined,
                "the changeArgs oldValue and newValue should be undefined");

            notEqual(origValuePropNames.length, 0,
                "can infer the properties that were changed via the pre-rejectChanges " +
                "original values if you remembered to capture them: " +
                origValuePropNames.toString());
        });
    /*********************************************************
    * get and set property values with Breeze property accessors
    * Breeze property accessor functions help utility authors
    * access entity property values w/o regard to the model library
    *********************************************************/
    test("can get and set property values with Breeze property accessors", 2, function () {

        var em = newEm();
        var customer = getFakeExistingcustomer(em);

        var name = "Ima Something Corp";
        customer.setProperty("CompanyName", name);
        equal(customer.getProperty("CompanyName"), name, "should get the same name we set");
        var entityStateName = customer.entityAspect.entityState.name;
        equal(entityStateName, "Modified", "setting with setProperty changes the entity state");

    });
    /*********************************************************
    * get entityType from an entity instance
    *********************************************************/
    test("can get entityType from an entity instance", 1, function () {

        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        deepEqual(customer.entityType, customerType,
            "an entity's entityType should be the type that created it");
    });
    
    /*********************************************************
    * can control custom ko entityState property via entityManager.entityChanged event
    * Illustrate how one can control a custom Knockout observable 
    * that is updated when the entity's entityState changes.
    * Perhaps there should be a Breeze event on the entityAspect
    *********************************************************/
    test("can control custom ko entityState property via entityManager.entityChanged", 1, function () {

        var em = newEm();
        addEntityStateChangeTracking(em);
        
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        customer.entityState = ko.observable("Detached");

        var expectedChangedStates = [];
        var actualChangedStates = []; // spy records KO property change events
        
        // Capture each time KO 'entityState' property raises its change event
        // which event would update a bound UI control
        customer.entityState.subscribe(
            function (newValue) { actualChangedStates.push(newValue.name); });

        // Now do things that should trigger the KO property change event
        em.addEntity(customer);
        expectedChangedStates.push("Added");
        customer.CompanyName("Acme"); // property changed but entityState doesn't
        customer.CompanyName("Beta"); // property changed but entityState doesn't
        
        customer.entityAspect.acceptChanges(); // simulate save
        expectedChangedStates.push("Unchanged");
        
        customer.CompanyName("Theta");
        expectedChangedStates.push("Modified");
        customer.CompanyName("Omega"); // property changed but entityState doesn't
        
        customer.entityAspect.rejectChanges(); // cancel
        expectedChangedStates.push("Unchanged");
        
        customer.entityAspect.setDeleted(); 
        expectedChangedStates.push("Deleted");

        deepEqual(actualChangedStates, expectedChangedStates,
            "'entityState' property should have seen the following changes: " +
            JSON.stringify(expectedChangedStates));
    });
    
    function addEntityStateChangeTracking(entityManager) {
        
        if (entityManager._entityStateChangeTrackingToken) { return; } // already tracking it
        
        // remember which handler is tracking; might unsubscribe in future
        entityManager._entityStateChangeTrackingToken =
            entityManager.entityChanged.subscribe(entityChanged);

        var entityStateChangeAction = breeze.EntityAction.EntityStateChange;
        
        function entityChanged(changeArgs) {            
            if (changeArgs.entityAction === entityStateChangeAction) {
                var entity = changeArgs.entity;
                if (entity.entityState) { // entity has the entityState ko property
                    entity.entityState(entity.entityAspect.entityState);
                }
            }}
    }
    /*********************************************************
    * TEST HELPERS
    *********************************************************/

    // new but not added to em
    function createCustomer(em, name) {
        name = name || "New customer";
        var customerType = em.metadataStore.getEntityType("Customer");
        var customer = customerType.createEntity();
        customer.CompanyName(name);
        return customer;
    }

    function getFakeExistingcustomer(em, name) {
        name = name || "Just Kidding";
        var customer = createCustomer(em, name);
        // pretend already exists
        return em.attachEntity(customer);
    }
    
    function getFakeDeletedcustomer(em, name) {
        var customer = getFakeExistingcustomer(em, name);
        customer.entityAspect.setDeleted();
        return customer;
    }
    
    // get the names of properties whose original values are in the originalValues hash map
    function getOriginalValuesPropertyNames(entity) {
        var names = [];
        for (var name in entity.entityAspect.originalValues) { names.push(name); }
        return names;
    }

    /*  Suggested future Test subjects
    *----------------------
    * Id Generation 
    *  Guid Ids of a new customer are store generated
    *  Int Ids of a new Order are store generated
    *  Ids of the composite key of a new OrderDetail must be client generated
    *
    * EntityAspect
    *    isBeingSaved (in combination with EM.entityChanged)
    *
    * EntityManager
    *   Clearing cache detaches all entities
    *   4 flavors of GetEntities
    *   EM.setProperties
    *   EM.entityChanged and EntityAction(query, save, add, attach)
    */
});