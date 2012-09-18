// ReSharper disable InconsistentNaming
define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var entityModel = testFns.breeze.entityModel;

    var handleFail = testFns.handleFail;
    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("exportImportTests", testFns.getModuleOptions(newEm));

    
    
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

    function getEmployeeType(em) {
        return em.metadataStore.getEntityType("Employee");
    }

    // new but not added to em
    function createEmployee(em, lastName) {
        lastName = lastName || "NewGuy";
        var empType = getEmployeeType(em);
        var emp = empType.createEntity();
        emp.LastName(lastName);
        return order;
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

});