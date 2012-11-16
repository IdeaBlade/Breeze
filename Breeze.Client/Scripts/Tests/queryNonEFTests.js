require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    var entityModel = breeze.entityModel;
    var EntityQuery = entityModel.EntityQuery;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityKey = entityModel.EntityKey;
    var FilterQueryOp = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;
    var QueryOptions = entityModel.QueryOptions;
    var FetchStrategy = entityModel.FetchStrategy;
    var MergeStrategy = entityModel.MergeStrategy;

    var newEm = testFns.newEm;
    
    module("queryNonEF", {
        setup: function () {
            // testFns.setup();
            testFns.setup({
                serviceName: "api/NonEFModel",
                serviceHasMetadata: false
            });
        },
        teardown: function () {
        }
    });
    
    
    test("getSimple - anonymous - Persons", function() {
        var em = newEm();
        // HACK - add to the API for this
        em.metadataStore.serviceNames.push(em.serviceName);
        var query = entityModel.EntityQuery.from("Persons");
        stop();
        
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0);
            var person = data.results[0];
            ok(person.meals.length > 0, "person should have meals");
            ok(person.meals[0].person === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length === 0,"shoud return 0 - not yet entities");
            start();
        }).fail(testFns.handleFail).fin(start);
        
    });
    
    test("getSimple - typed - Persons", function () {
        var em = newEm();
        // HACK - add to the API for this
        em.metadataStore.serviceNames.push(em.serviceName);
        initializeMetadataStore(em.metadataStore);
        var query = entityModel.EntityQuery.from("Persons");
        stop();

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0);
            var person = data.results[0];
            ok(person.meals.length > 0, "person should have meals");
            ok(person.meals[0].person === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length === 0, "shoud return 0 - not yet entities");
            start();
        }).fail(testFns.handleFail).fin(start);

    });
    
    function initializeMetadataStore(metadataStore) {
        
    }
    return testFns;

});

