/// <reference path="..\breeze.debug.js" />

(function (root) {
    var ko = root.ko,
        breeze = root.breeze,
        logger = root.app.logger;

    root.app = {};
    var app = root.app;

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);

    // service name is route to the Web API controller
    // var serviceName = 'breeze/BreezeSample';
    var serviceName = "breeze/Northwind";

    // manager is the service gateway and cache holder
    var manager = new breeze.EntityManager(serviceName);

    // app.getTodos = getTodos;
    app.getCustomers = getCustomers;

    //#region private functions
    var i = 0;
    function getCustomers() {
        logger.info("querying Customers");
        i = i + 1;
        // (1)
        // one of the following
        //if ((i % 5) === 0) {
        //    manager.clear();
        //}
        
        // (2)
        // manager.clear();

        // (3)
        manager = new breeze.EntityManager(serviceName);
        
        // (4)
        //manager = new breeze.EntityManager({
        //    metadataStore: manager.metadataStore,
        //    serviceName: serviceName
        //});
        
        var query = breeze.EntityQuery.from("Customers");

        var promises = [];
        for (var j = 0; j < 10; j++) {
            promises.push(manager
                .executeQuery(query)
                .then(querySucceeded)
                .fail(queryFailed));
        }
        return promises;
    };
    

    // get Todos asynchronously
    // returning a promise to wait for     
    function getTodos() {

        logger.info("querying Todos");

        var query;
        for (var i = 0; i < 100; i++) {
            query = breeze.EntityQuery.from("Todos");
            // query = query.where("IsDone", "==", false);
        }

        
        return manager
            .executeQuery(query)
            .then(querySucceeded)
            .fail(queryFailed);
        
    };

    var entitiesCount = 0;
    // reload vm.todos with the results 
    function querySucceeded(data) {
        logger.success("queried");
        entitiesCount += data.results.length;
        $('#resultsCount').html( entitiesCount );
    }

    function queryFailed(error) {
        logger.error("Query failed: " + error.message);
    }

    function saveChanges() {
        return manager.saveChanges()
            .then(function () { logger.success("changes saved"); })
            .fail(saveFailed);
    }

    function saveFailed(error) {
        logger.error("Save failed: " + error.message);
    }
    //#endregion

}(window));