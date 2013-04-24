app.dataservice = (function (breeze, logger) {

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    
    var serviceName = 'breeze/northwind'; // route to the same origin Web Api controller
   
    // *** Cross origin service example  ***
    //var serviceName = 'http://todo.breezejs.com/breeze/northwind'; // controller in different origin

    var manager = new breeze.EntityManager(serviceName);
    var _isSaving = false;
    
    return {
        getAllCustomers: getAllCustomers,
        getOrders: getOrders,
        createCustomer: createCustomer
    };

    /*** implementation details ***/
 
    //#region main application operations
    function getAllCustomers() {
        var query = breeze.EntityQuery
                .from("Customers")
                .orderBy("CompanyName");

        return manager.executeQuery(query);
    }
    
    function getOrders(customer) {
        return customer.entityAspect.loadNavigationProperty("Orders");
    }

    function createCustomer() {
        return manager.createEntity("Customer");
    }

    function saveChanges(suppressLogIfNothingToSave) {
        if (manager.hasChanges()) {
            if (_isSaving) {
                setTimeout(saveChanges, 50);
                return;
            }
            _isSaving = true;
            manager.saveChanges()
                .then(saveSucceeded)
                .fail(saveFailed)
                .fin(saveFinished);
        } else if (!suppressLogIfNothingToSave) {
            logger.info("Nothing to save");
        };
    }
    
    function saveSucceeded(saveResult) {
        logger.success("# of Todos saved = " + saveResult.entities.length);
        logger.log(saveResult);
    }
    
    function saveFailed(error) {
        var reason = error.message;
        var detail = error.detail;
        
        if (reason === "Validation error") {
            handleSaveValidationError(error);
            return;
        }
        if (detail && detail.ExceptionType &&
            detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
            // Concurrency error 
            reason =
                "Another user, perhaps the server, may have deleted one or all of the todos.";
            manager.rejectChanges(); // DEMO ONLY: discard all pending changes
        }

        logger.error(error,
            "Failed to save changes. " + reason +
            " You may have to restart the app.");
    };

    function saveFinished() { _isSaving = false; }
    
    function handleSaveValidationError(error) {
        var message = "Not saved due to validation error";
        try { // fish out the first error
            var firstErr = error.entitiesWithErrors[0].entityAspect.getValidationErrors()[0];
            message += ": " + firstErr.errorMessage;
        } catch (e) { /* eat it for now */ }
        logger.error(message);
    }
    
    //#endregion
    

})(breeze, app.logger);