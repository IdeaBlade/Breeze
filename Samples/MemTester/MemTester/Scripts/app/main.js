/// <reference path="..\breeze.debug.js" />

(function (root) {
    var ko = root.ko,
        breeze = root.breeze,
        logger = root.app.logger;

    root.app = {};
    var app = root.app;

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);

    // service name is route to the Web API controller
    // var serviceName = 'api/BreezeSample';
    var serviceName = "api/Northwind";

    // manager is the service gateway and cache holder
    var manager = new breeze.EntityManager(serviceName);

    // app.getTodos = getTodos;
    app.getCustomers = getCustomers;

    //#region private functions
    
    function getCustomers() {
        logger.info("querying Customers");
        manager.clear();
        var query = breeze.EntityQuery.from("Customers");
        
        return manager
            .executeQuery(query)
            .then(querySucceeded)
            .fail(queryFailed);
        
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
    
    // reload vm.todos with the results 
    function querySucceeded(data) {
        logger.success("queried");

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