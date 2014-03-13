// ReSharper disable InconsistentNaming
(function(testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);
    
    // convenience variables
    var EntityState = breeze.EntityState;
    var dummyCustID = testFns.newGuidComb();
    var dummyEmpID = 42;
    var UNCHGD = EntityState.Unchanged;
    
    module("entityTests", testFns.getModuleOptions(newEm));

    /*********************************************************
    * Add a Customer using preferred EntityManager.createEntity method
    *********************************************************/
    test("add Customer with manager.CreateEntity", 1, function() {
        var em = newEm();
        var newCust = em.createEntity("Customer",
            { CustomerID: testFns.newGuidComb() }); // initializes the client-generated key
        ok(newCust.entityAspect.entityState.isAdded(), "newCust should be 'added'");
    });

    /*********************************************************
    * Add a Customer using the EntityType and confirm its EntityState
    * Do so in the more verbose approach using the EntityType
    *   - get the type
    *   - use the type to create the entity instance
    *   - initialize values of the entity (the key in this case)
    *   - add the entity to the EntityManager's cache
    * Many of the tests in this file use this technique
    * Either technique works; this is just more verbose
    *********************************************************/
    test("add Customer using the EntityType", 1, function() {
        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer");
        var newCust = customerType.createEntity();      
        newCust.CustomerID(testFns.newGuidComb());
        em.addEntity(newCust);

        ok(newCust.entityAspect.entityState.isAdded(), "newCust should be 'added'");
    });


    /*********************************************************
    * create a Customer with a known key
    * in the unchanged state as if it had been queried
    * A technique often used in testing to create a mock entity
    *********************************************************/
    test("create a Customer in the unchanged state as if it had been queried", 1, function () {
        var em = newEm();
        var cust = em.createEntity('Customer', {
                  CustomerID: dummyCustID,
                  CompanyName: 'Foo Co',
                  ContactName: 'Ima Kiddin'
              },UNCHGD);  // creates the entity in the Unchanged state
        ok(cust.entityAspect.entityState.isUnchanged(), "cust should be 'Unchanged'");
    });

    /*********************************************************
    * create a Customer with a known key 
    * in the modified state as if it had been queried
    * A technique often used in testing to create a mock entity
    *********************************************************/
    test("create a Customer in the modified state as if it had been queried", 8, function () {
        var em = newEm();
        var cust = em.createEntity('Customer',{
                CustomerID: dummyCustID,
                CompanyName: 'Foo Co',
                ContactName: 'Ima Kiddin'
            }, UNCHGD);  // creates the entity in the Unchanged state first
        
        // now modify it to suit your needs
        cust.CompanyName("Bar Co");
        cust.Phone("510-555-1212");
        
        ok(cust.entityAspect.entityState.isModified(), "cust should be 'Modified'");
        equal(cust.CompanyName(), 'Bar Co', "should have modified CompanyName");
        equal(cust.ContactName(), 'Ima Kiddin', "should have modified ContactName");
        equal(cust.Phone(), "510-555-1212", "should have expected Phone");
        
        // revert it
        cust.entityAspect.rejectChanges();
        ok(cust.entityAspect.entityState.isUnchanged(), "cust should be 'Unchanged' after rejectChanges");

        equal(cust.CompanyName(), 'Foo Co', "should have reverted CompanyName after rejectChanges");
        equal(cust.ContactName(), 'Ima Kiddin', "should have same ContactName after rejectChanges");
        equal(cust.Phone(), null, "should have reverted Phone to null after rejectChanges");
    });
 
    /*********************************************************
    * create a Customer in the deleted state w/o querying it first
    * when you know which entity to delete but don't want to retrieve it first
    * Always specify the key and any properties necessary
    * to satisfy server-side validity and concurrency checks
    *********************************************************/
    test("create a Customer in the deleted state w/o querying it first", 1, function () {
        var em = newEm();
        var cust = em.createEntity('Customer',
            { CustomerID: dummyCustID },
            EntityState.Deleted);  // creates the entity in the Deleted state
        ok(cust.entityAspect.entityState.isDeleted(), "cust should be 'Deleted'");
    });

    /*********************************************************
    * Add an Order with initializer that sets its parent Customer by Id
    *********************************************************/
    test("add Customer created using initializer with parent Customer Id", 4, function() {
        var em = newEm();

        // create a new parent Customer
        var parentCustomer = em.createEntity("Customer", {
            CustomerID: dummyCustID,
            CompanyName: 'TestCo'
        });

        // a new Order which is a child of the parent Customer
        var newOrder = em.createEntity("Order", {
             CustomerID: parentCustomer.CustomerID()
        });

        ok(newOrder.entityAspect.entityState.isAdded(), "newOrder should be 'added'");
        ok(parentCustomer.entityAspect.entityState.isAdded(), "parentCustomer should be 'added'");
        var orderCustomer = newOrder.Customer();
        ok(orderCustomer, "newOrder's parent 'Customer' property should return a Customer entity");
        ok(orderCustomer === parentCustomer,
            "newOrder's parent Customer should be " + parentCustomer.CompanyName());
    });

    /*********************************************************
    * Add an OrderDetail with initializer that set its composite key with ids
    * Interesting because client must supply the composite key
    * and both parts of that key are ids of parent entities, Order and Product
    *********************************************************/
    test("add OrderDetail created using initializer with parent ids", 1, function() {
        var em = newEm();
        var newDetail = em.createEntity("OrderDetail",
            { OrderID: 1, ProductID: 1 });
        ok(newDetail.entityAspect.entityState.isAdded(), "newDetail should be 'added'");
    });

    /*********************************************************
    * Add an OrderDetail with initializer that set its composite key via related entities
    * This does not work as of v.1.3.0. See Feature Request #2155
    *********************************************************/
    test("add OrderDetail created using initializer with parent entities", 1, function() {
        var em = newEm();
        var newDetail = null;
        // pretend parent entities were queried
        var parentOrder = em.createEntity("Order",
            { OrderID: 1 }, UNCHGD);
        var parentProduct = em.createEntity("Product",
            { ProductID: 1 }, UNCHGD);
        try {
            // Can't initialize with related entity. Feature request to make this possible         
            newDetail = em.createEntity("OrderDetail", { Order: parentOrder, Product: parentProduct });
        } catch(ex) { /* test will fail */
        }
        ok(newDetail && newDetail.entityAspect.entityState.isAdded(), "newDetail should be 'added'");
    });

    /*********************************************************
    * entityAspect.rejectChanges of added entity detaches it
    *********************************************************/

    test("rejectChanges of added entity detaches it", function() {
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

    test("local query does not return added entity after rejectChanges", 2, function() {
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

    test("find deleted entity in cache with getEntities()", 1, function() {

        var em = newEm();
        var customer = getFakeDeletedCustomer(em);

        // get the first (and only) entity in cache
        var customerInCache = em.getEntities()[0];

        equal(customerInCache, customer,
            "customer in cache is the one we deleted");

    });

    /*********************************************************
    * can find deleted entity in cache by key
    *********************************************************/

    test("find deleted entity in cache by key", 1, function() {

        var em = newEm();
        var customer = getFakeDeletedCustomer(em);

        var customerType = em.metadataStore.getEntityType("Customer");
        var key = new breeze.EntityKey(customerType, customer.CustomerID());

        var foundcustomer = em.findEntityByKey(key);
        ok(foundcustomer !== null,
            "found deleted customer in cache with 'findEntityByKey'");

    });

    /*********************************************************
    * does not return deleted entity in cache when queryLocally
    *********************************************************/

    test("does not return deleted entity in cache when queryLocally", 1, function() {

        var em = newEm();
        var customer = getFakeDeletedCustomer(em);

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
    test("original values are tracked after entity is attached", 5, function() {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        // created but not attached
        var employee = empType.createEntity({ EmployeeID: 1 });

        employee.LastName("Smith"); // set value before attached
        employee.LastName("Jones"); // change value before attaching 

        var origValuePropNames = getOriginalValuesPropertyNames(employee);
        equal(origValuePropNames.length, 0,
            "No original values tracked for a detached entity.");

        // attach as Unchanged. 
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
        function() {

            var em = newEm(); // new empty EntityManager

            var employee = getFakeExistingEmployee(em,'Jones'); 

            // After next change, should be tracking original value, 'Jones'
            employee.LastName("Black");

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
        function() {
            var em = newEm();
            var employee = getFakeExistingEmployee(em);
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
        function() {
            var em = newEm();
            var employee1 = getFakeExistingEmployee(em, 'Bob', 'Jones', 1);
            var employee2 = getFakeExistingEmployee(em, 'Sally', 'Smith', 2);

            // creating this tedious way to prove that ...
            var orderType = em.metadataStore.getEntityType("Order");
            var order = orderType.createEntity();
            order.EmployeeID(42);
            // ... setting navigation property pulls the order into Employee's manager
            order.Employee(employee1);

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
        function() {
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
    test("setUnchanged() does not restore property values", 4, function() {

        var em = newEm(); // new empty EntityManager
        var employee = getFakeExistingEmployee(em, 'Jones');

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
        function() {

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
        function() {

            var em = newEm(); // new empty EntityManager
            var empType = em.metadataStore.getEntityType("Employee");

            var employee = empType.createEntity(); // created but not attached
            employee.EmployeeID(1);
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
                "After acceptChanges, 'entityAspect.originalValues' should be empty; it is: " +
                    origValuePropNames.toString());

        });

    /*********************************************************
    * entityState is Detached after calling acceptChanges on deleted entity
    * Beware of acceptChanges; it makes an entity look like it was saved
    *********************************************************/
    test("entityState is Detached after calling acceptChanges on deleted entity", 1,
        function() {

            var em = newEm(); // new empty EntityManager
            var empType = em.metadataStore.getEntityType("Employee");

            var employee = empType.createEntity(); // created but not attached
            employee.EmployeeID(1);
            em.attachEntity(employee); // simulate existing employee

            employee.entityAspect.setDeleted();
            employee.entityAspect.acceptChanges(); // simulate post-save state
            //em.acceptChanges(); // this works too ... for all changed entities in cache

            ok(employee.entityAspect.entityState.isDetached(),
                'employee should be "Detached" after calling acceptChanges');
    });

    /*********************************************************
     * detached entity retains its foreign keys but not its related entities
     *********************************************************/
    test("detached entity retains its foreign keys", 9, function() {
        var em = newEm();
        var cust = getFakeExistingCustomer(em);
        var emp = getFakeExistingEmployee(em);
        var order = em.createEntity('Order', {
            OrderID: 1,
            Customer: cust,
            Employee: emp
        }, UNCHGD);

        // Pre-detach asserts
        equal(order.getProperty('CustomerID'), cust.getProperty('CustomerID'), "pre-detached order has CustomerID");
        equal(order.getProperty('EmployeeID'), emp.getProperty('EmployeeID'), "pre-detached order has EmployeeID");
        equal(order.getProperty('Customer'), cust, "pre-detached order has a Customer");
        equal(order.getProperty('Employee'), emp, "pre-detached order has an Employee");

        order.entityAspect.setDetached();

        // Post-detach asserts
        equal(order.getProperty('CustomerID'), cust.getProperty('CustomerID'), "post-detached order has CustomerID");
        equal(order.getProperty('EmployeeID'), emp.getProperty('EmployeeID'), "post-detached order has EmployeeID");
        equal(order.getProperty('Customer'), null, "post-detached order no longer has a Customer");
        equal(order.getProperty('Employee'), null, "post-detached order no longer has an Employee");
        deepEqual(order.entityAspect.originalValues, {}, "detaching does not add to 'originalValues'");
    });

    /*********************************************************
     * detached entity losses its original values
     *********************************************************/
    test("detached entity losses its original values", 2, function () {
        var em = newEm();
        var order = em.createEntity('Order', { OrderID: 1 }, UNCHGD);
        order.setProperty('OrderDate',new Date(1960, 19, 4));
        var aspect = order.entityAspect;
        equal(Object.keys(aspect.originalValues).length, 1, "setting date added to originalValues");
        aspect.setDetached();
        equal(Object.keys(aspect.originalValues).length, 0, "detaching cleared originalValues");
    });

    /*********************************************************
     * detach parent does not change EntityState or FK of dependent entity
     *********************************************************/
    test("detach parent does not change EntityState or FK of dependent entity", 3, function () {
        var em = newEm();
        var cust = getFakeExistingCustomer(em);
        var emp = getFakeExistingEmployee(em);
        var order = em.createEntity('Order', {
            OrderID: 1,
            Customer: cust,
            Employee: emp
        }, UNCHGD);

        // detach the order's parent Customer
        cust.entityAspect.setDetached();

        equal(order.getProperty('CustomerID'), cust.getProperty('CustomerID'), "dependent order retains its CustomerID");
        equal(order.getProperty('Customer'), null, "dependent order no longer has a Customer");
        equal(order.entityAspect.entityState.name, UNCHGD.name, "dependent order remains in 'Unchanged' state");
    });

    /*********************************************************
     * detaching parent entity has no effect on in-cache children (variation on previous test)
     *********************************************************/
    test("detaching parent entity has no effect on in-cache children", 5,
        function () {
            var em = newEm(); // new empty EntityManager
            var order = em.createEntity('Order', {
                 OrderID: 1
            }, UNCHGD);
            var detail = em.createEntity('OrderDetail', {
                OrderID: 1,
                ProductID: 1,
                Quantity: 1,
                UnitPrice: 1
            }, UNCHGD);
            
            equal(detail.Order(), order,
                "'detail' should have expected parent 'order'");

            em.detachEntity(order); // THE MOMENT OF TRUTH
 
            var orderStateName = order.entityAspect.entityState.name;
            equal(orderStateName, EntityState.Detached.name,
                 "parent 'order' should be detached");
            var detailStateName = detail.entityAspect.entityState.name;
            equal(detailStateName, UNCHGD.name,
                "child 'detail' should be unchanged by detach of parent 'order'");
            equal(detail.OrderID(), order.OrderID(),
                "'detail.OrderID' (FK) should equal 'order.OrderID' (Parent ID)");
            equal(detail.Order(), null,
                "'detail.Order' should be null");
        });
    
    /*********************************************************
    * Can detach parent and children in one step
    *********************************************************/
    test("Can detach parent and children in one step", 3,
        function () {           
            var em = newEm(); // new empty EntityManager
            var order = em.createEntity('Order', {
                OrderID: 1
            }, UNCHGD);
            
            // Add two details to the order (re)
            var details = [
                em.createEntity('OrderDetail', {
                    OrderID: 1, ProductID: 1, Quantity: 1, UnitPrice: 1
                }, UNCHGD),
                em.createEntity('OrderDetail', {
                    OrderID: 1, ProductID: 2, Quantity: 1, UnitPrice: 1
                }, UNCHGD)
            ];

            // THE MOMENT OF TRUTH
            [].concat(order.OrderDetails(), order).forEach(function(item) {
                em.detachEntity(item);
            });

            var orderState = order.entityAspect.entityState;
            var detailState = details[0].entityAspect.entityState;
            ok(orderState.isDetached(),  "parent 'order' should be detached");
            ok(detailState.isDetached(), "first child 'detail' should be detached");
            ok(!em.hasChanges(),
                "EntityManager should NOT have pending changes.");

            //var orderStateName = order.entityAspect.entityState.name;
            //var detailStateName = details[0].entityAspect.entityState.name;
            //equal(orderStateName, detached.name,
            //     "parent 'order' should be detached");           
            //equal(detailStateName, detached.name,
            //    "first child 'detail' should be detached");
            //ok(!em.hasChanges(),
            //    "EntityManager should NOT have pending changes.");
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
            employee.EmployeeID(1);
            employee.LastName("Jones");
            em.attachEntity(employee);// attach as Unchanged. 
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
        var customer = getFakeExistingCustomer(em);

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
        customer.CustomerID(dummyCustID);
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
    * Changing a part of a date doesn't trigger property changed
    * contrast with "Changing the whole date does trigger property changed"
    *********************************************************/
    test("Changing a part of a date doesn't trigger property changed", 3, function() {
       
        var em = newEm();
        var order = em.createEntity('Order', {
                OrderID: 42,
                OrderDate: new Date(2013, 1, 1)
            }, UNCHGD);
        
        var orderDate = order.getProperty("OrderDate");
        var originalDate = new Date(orderDate); // clone it
        var newDay = orderDate.getDate() + 1;
        orderDate.setDate(newDay);
        
        // the date parts are not observable
        // therefore, although the entity's order date has changed
        // the entity doesn't know about it and remains in unmodified state.
        var afterDate = order.getProperty("OrderDate");

        notStrictEqual(afterDate, originalDate, "the OrderDate should have changed");
        equal(afterDate.getDate(), newDay,
            "the day of the OrderDate should have changed");

        var entityStateName = order.entityAspect.entityState;
        equal(entityStateName, "Unchanged", "the entitystate should be 'Unchanged'");
    });
    /*********************************************************
    * Changing the whole date does trigger property changed
    * contrast with "Changing a part of a date doesn't trigger property changed"
    *********************************************************/
    test("Changing the whole date does trigger property changed", 1, function () {

        var em = newEm();
        var order = em.createEntity('Order', {
                OrderID: 42,
                OrderDate: new Date(2013, 1, 1)
            }, UNCHGD);

        var newOrderDate = getDifferentDate(order.getProperty("OrderDate"));
        order.setProperty("OrderDate", newOrderDate);

        var entityStateName = order.entityAspect.entityState;
        equal(entityStateName, "Modified", "the entitystate should be 'Modified'");
    });

    function getDifferentDate(date) {
        var newDate = new Date(date);
        newDate.setDate(1 + date.getDate());
        return newDate;
    }
    /*********************************************************
    * Store-managed int ID is a negative temp id after addEntity
    *********************************************************/
    test("Store-managed int ID is a negative temp id after addEntity", 2, function() {

        var em = newEm();

        var employeeType = em.metadataStore.getEntityType("Employee");
        var emp = employeeType.createEntity();
        equal(emp.EmployeeID(), 0, "id should be zero at creation");
        
        // manager should replace '0' with generated temp id that is < 0
        em.addEntity(emp);
        var id = emp.EmployeeID();
        ok(id < 0,
            "id should be negative after addEntity; is "+ id +
            " whose state is "+ emp.entityAspect.entityState.name);
    });
    /*********************************************************
    * Store-managed int ID remains '0' after attachEntity
    * even though '0' is the trigger for temp id gen if was added instead
    *********************************************************/
    test("Store-managed int ID remains '0' after attachEntity", 2, function () {

        var em = newEm();
        var employeeType = em.metadataStore.getEntityType("Employee");
        var emp = employeeType.createEntity();
        equal(emp.EmployeeID(), 0, "id should be zero at creation");
        
        // manager should NOT replace '0' with generated temp id 
        em.attachEntity(emp);
        var id = emp.EmployeeID();
        equal(id, 0,
            "id should still be '0' after attachEntity whose state is "+
            emp.entityAspect.entityState.name);
    });
    
    /*********************************************************
    * TEST HELPERS
    *********************************************************/
    function getFakeExistingCustomer(em, name) {
        return em.createEntity('Customer', {
            CustomerID: dummyCustID,
            CompanyName: name || "Just Kidding"
        }, UNCHGD);
    }

    function getFakeDeletedCustomer(em, name) {
        var customer = getFakeExistingCustomer(em, name);
        customer.entityAspect.setDeleted();
        return customer;
    }

    function getFakeExistingEmployee(em, lastName, firstName, empID) {
       return em.createEntity('Employee', {
           EmployeeID: empID || dummyEmpID,
           FirstName: firstName || "Dem",
           LastName: lastName|| "Bones"
        }, UNCHGD);
    }
   
    // get the names of properties whose original values are in the originalValues hash map
    function getOriginalValuesPropertyNames(entity) {
        var names = [];
        var originalValues = entity.entityAspect.originalValues;
        for (var name in originalValues) { names.push(name); }
        return names;
    }

})(docCode.testFns);