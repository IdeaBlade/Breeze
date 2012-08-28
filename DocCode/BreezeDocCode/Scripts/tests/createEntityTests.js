
define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var entityModel = breeze.entityModel;

    var MetadataStore = entityModel.MetadataStore;

    var serviceName = testFns.northwindServiceName,
        metadataStore = new MetadataStore(),
        newEm = testFns.emFactory(serviceName, metadataStore);

    testFns.module("createEntityTests", newEm, metadataStore);

    test("add customer", 2, function () {
        var em = newEm();
        var customerType = em.metadataStore.getEntityType("Customer"); // [1]
        var newCust = customerType.createEntity(); // [2]
        em.addEntity(newCust); // [3]

        ok(newCust.entityAspect.entityState.isAdded(), "newCust should be 'added'");
    });

    return testFns;

});