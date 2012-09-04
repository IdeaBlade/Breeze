// ReSharper disable InconsistentNaming
define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/

    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("entityTests", testFns.getModuleOptions(newEm));

    /*********************************************************
    * Add a customer and confirm its EntityState
    *********************************************************/
    test("add customer", 1, function () {

        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer"); // [1]
        var newCust = customerType.createEntity(); // [2]
        em.addEntity(newCust); // [3]

        ok(newCust.entityAspect.entityState.isAdded(), "newCust should be 'added'");
    });

    /*********************************************************
    * entityAspect.rejectChanges of added entity detaches it
    * RESTORE TEST WHEN BREEZE IS FIXED WHEN #2143 IS RESOLVED
    *********************************************************/

//    test("rejectChanges of added entity detaches it", function () {
//        var em = newEm();

//        var typeInfo = em.metadataStore.getEntityType("Order");
//        var newEntity = typeInfo.createEntity();
//        em.addEntity(newEntity);

//        var entityState = newEntity.entityAspect.entityState;
//        ok(entityState.isAdded(),
//            "newEntity should be in Added state; is " + entityState);

//        newEntity.entityAspect.rejectChanges();

//        entityState = newEntity.entityAspect.entityState;
//        ok(entityState.isDetached(),
//            "newEntity should be Detached after rejectChanges; is " + entityState);

//        ok(!em.hasChanges(), "should not have changes");

//        var inCache = em.getEntities(), count = inCache.length;
//        ok(count == 0, "should have no entities in cache; have " + count);

//    });

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