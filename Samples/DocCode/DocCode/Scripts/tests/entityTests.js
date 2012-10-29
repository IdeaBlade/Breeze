// ReSharper disable InconsistentNaming
define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var entityModel = testFns.breeze.entityModel;
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
        var key = new entityModel.EntityKey(customerType, customer.CustomerID());

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

        var customerQuery = entityModel.EntityQuery.fromEntities(customer);
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
    * original values are tracked AFTER attached
    *********************************************************/
    test("original values are tracked AFTER entity is attached", 3, function () {

        var em = newEm(); // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity(); // created but not attached
        employee.LastName("Smith"); // initial value before attached
        employee.LastName("Jones"); // change value before attaching   

        // Attach as "Unchanged". Original values captured
        // Should be "Jones", not "Smith"
        em.attachEntity(employee);

        var origLastName = employee.entityAspect.originalValues['LastName'];
        ok(typeof origLastName === "undefined", 
            "Only have original value after value has changed.");

        employee.LastName("What"); // change

        // originalValues is a hash map so property syntax works
        origLastName = employee.entityAspect.originalValues.LastName;
        ok(origLastName === "Jones",
            "New LastName is '{0}', original value is '{1}' "
                .format(employee.LastName(), origLastName));
        
        em.rejectChanges(); //reverts to original values

        var currentLastName = employee.LastName();
        equal(currentLastName, origLastName,
            "After rejectChanges, employee LastName is " + currentLastName);

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

    /*  Suggested Test subjects
    *----------------------
    * Id Generation 
    *  Guid Ids of a new customer are store generated
    *  Int Ids of a new Order are store generated
    *  Ids of the composite key of a new OrderDetail must be client generated
    *
    * EntityAspect
    *    acceptChanges/rejectChanges
    *    propertyChanged
    *    validationErrorsChanged
    *    isBeingSaved (in combination with EM.entityChanged)
    *    EM.entityChanged (as we watch notification)
    *
    * EntityManager
    *   Remove entity from cache with em.detach(); changes its entity state to detached
    *   Clearing cache detaches all entities
    *   4 flavors of GetEntities
    *   EM.setProperties
    *   EM.entityChanged and EntityAction(query, save, add, attach)
    */
});