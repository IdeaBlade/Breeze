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
        var customerType = getCustomerType(em);
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

    test("find deleted entity in cache with getEntities()", 3, function () {

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

    test("find deleted entity in cache by key", 3, function () {

        var em = newEm();
        var customer = getFakeDeletedcustomer(em);

        var customerType = getCustomerType(em);
        var key = new entityModel.EntityKey(customerType, customer.CustomerID());

        var foundcustomer = em.findEntityByKey(key);
        ok(foundcustomer !== null,
            "found deleted customer in cache with 'findEntityByKey'");

    });

    /*********************************************************
    * does not return deleted entity in cache when queryLocally
    *********************************************************/

    test("does not return deleted entity in cache when queryLocally", 3, function () {

        var em = newEm();
        var customer = getFakeDeletedcustomer(em);

        var customerQuery = entityModel.EntityQuery.fromEntities(customer);
        var queryResults = em.executeQueryLocally(customerQuery);

        if (queryResults.length === 0) {
            ok(true, "query for deleted customer in cache returned none");
        } else {
            var queriedcustomer = queryResults[0];
            ok(false, "query unexpectedly returned customer '" +
                queriedcustomer.CompanyName() + "' in state=" +
            queriedcustomer.entityAspect.entityState);
        }

    });

    /*********************************************************
    * can stash changes locally and restore
    *********************************************************/
    test("stash changes locally and restore", 6, function () {

        var em = newEm();

        // add a new customer and new order to the cache
        var newCust = em.addEntity(createCustomer(em, "Ima Nu"));
        var newOrder = em.addEntity(createOrder(em, "Suez He"));

        // new order belongs to new customer
        newOrder.Customer(newCust);

        var changes = em.getChanges();
        var changesExport = em.export(changes);

        ok(window.localStorage, "this browser supports local storage");

        var stashName = "stash_changes";
        window.localStorage.setItem(stashName, changesExport);

        em.clear();
        ok(em.getEntities().length === 0, 
            "em should be empty after clearing it");

        var changesImport = window.localStorage.getItem(stashName);
        em.import(changesImport);

        var entitiesInCache = em.getEntities();
        var restoreCount = entitiesInCache.length;
        equal(restoreCount, 2, "restored 2 entities from file");

        var restoredOrder = em.getEntities(getOrderType(em))[0];
        var orderState = restoredOrder.entityAspect.entityState;
        ok(orderState.isAdded(),
             "restored order entitystate is " + orderState);

        var restoredCust = restoredOrder.Customer(); // by navigation
        ok(restoredCust !== null,
             "Got Customer of restored Order '" + 
                 restoredCust.CompanyName() + 
                 "'  by navigation");

        var restoredCustID = restoredCust.CustomerID();
        var newCustID = newCust.CustomerID();
        ok(restoredCustID !== newCustID,
             "However restored CustomerID '" + restoredCustID +
             "' is DIFFERENT from the original CustomerID '" + newCustID +
             "' as expected after importing an entity with a tempId");
    });


    /*********************************************************
    * TEST HELPERS
    *********************************************************/

    function getCustomerType(em) {
        return em.metadataStore.getEntityType("Customer");
    }

    function getFakeDeletedcustomer(em, name) {
        var customer = getFakeExistingcustomer(em, name);

        customer.entityAspect.setDeleted();
        ok(customer.entityAspect.entityState.isDeleted(),
        "'" + customer.CompanyName() + "' is in 'deleted' state after setDelete()");

        return customer;
    }

    function getFakeExistingcustomer(em, name) {
        name = name || "Just Kidding";
        var customer = createCustomer(em, name);

        // pretend already exists
        em.attachEntity(customer);
        ok(customer.entityAspect.entityState.isUnchanged(),
        "faked existing customer '" + customer.CompanyName() + "' is in 'Unchanged' state");

        return customer;
    }

    // new but not added to em
    function createCustomer(em, name) {
        name = name || "New customer";
        var customerType = getCustomerType(em);
        var customer = customerType.createEntity();
        customer.CompanyName(name);
        return customer;
    }

    function getOrderType(em) {
        return em.metadataStore.getEntityType("Order");
    }

    // new but not added to em
    function createOrder(em, shipName) {
        shipName = shipName || "New Order";
        var orderType = getOrderType(em);
        var order = orderType.createEntity();
        order.ShipName(shipName);
        return order;
    }

    /*  Suggested Test subjects
    *----------------------
    * Navigation properties
    * Id Generation 
    *  Guid Ids of a new customer are store generated
    *  Int Ids of a new Order are store generated
    *  Ids of the composite key of a new OrderDetail must be client generated
    *
    * EntityAspect
    *    acceptChanges/rejectChanges
    *    add/get/remove ValidationErrors
    *    propertyChanged
    *    validationErrorsChanged
    *    isBeingSaved (in combination with EM.entityChanged)
    *    EM.entityChanged (as we watch notification)
    *
    * EntityManager
    *   Remove entity from cache with em.detach(); changes its entity state to detached
    *   Clearing cache detaches all entities
    *   4 flavors of GetEntities
    *   Import/export (between EMs and to localStorage)
    *   EM.setProperties
    *   EM.entityChanged and EntityAction(query, save, add, attach)
    *
    * Validation (sigh ... lots to do)

    *

    */
});