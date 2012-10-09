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