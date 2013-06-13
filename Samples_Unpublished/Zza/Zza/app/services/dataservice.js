(function () {
    'use strict';
    angular.module('app').factory('dataservice',
    
    ['breeze', 'model', 'config', 'logger', '$timeout',
    function (breeze, model, config, logger, $timeout) {
                
        var EntityQuery = breeze.EntityQuery,
            afterInit,
            manager;
        
        configureBreeze();

        var dataservice = {
            initialize: initialize,
            getAllCustomers: getAllCustomers,
            getOrders: getOrders,
            saveChanges: saveChanges
        };
        return dataservice;

        //#region main application operations
        function initialize() {
            afterInit = EntityQuery.from('Lookups').using(manager)
                .execute.then(gotLookups).fail(initFailed);
        }
        
        function getAllCustomers() {
            var query = EntityQuery
                .from("Customers")
                .orderBy("CompanyName");

            return manager.executeQuery(query);
        }

        function getOrders(customer) {
            return customer.entityAspect.loadNavigationProperty("Orders");
        }
        
        //#region saveChanges
        
        function saveChanges() {
            return manager.saveChanges()
                .then(saveSucceeded)
                .fail(saveFailed);

            function saveSucceeded(saveResult) {
                logger.success("# of entities saved = " + saveResult.entities.length);
                logger.log(saveResult);
            }

            function saveFailed(error) {
                var reason = error.message;
                var detail = error.detail;

                if (reason === "Validation error") {
                    reason = handleSaveValidationError(error);
                } else if (detail && detail.ExceptionType &&
                    detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
                    // Concurrency error 
                    reason =
                        "Another user, perhaps the server, " +
                        "may have deleted some or all of the changed data." +
                        " You may have to restart the app.";
                } else {
                    reason = "Failed to save changes: " + reason +
                             " You may have to restart the app.";
                }

                logger.error(error, reason);
                // DEMO ONLY: discard all pending changes
                // Let them see the error for a second before rejecting changes
                $timeout(function () {
                    manager.rejectChanges();
                }, 1000);
                throw error; // so caller can see it
            }
        }

        function handleSaveValidationError(error) {
            var message = "Not saved due to validation error";
            try { // fish out the first error
                var firstErr = error.entitiesWithErrors[0].entityAspect.getValidationErrors()[0];
                message += ": " + firstErr.errorMessage;
            } catch (e) { /* eat it for now */ }
            return message;
        }
        //#endregion
        
        function configureBreeze() {
            breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
            breeze.NamingConvention.camelCase.setAsDefault();
            
            var serviceName = config.serviceName; 
            manager = new breeze.EntityManager(serviceName);
            manager.enableSaveQueuing(true);
            model.configureMetadataStore(manager.metadataStore);
            return manager;
        }
        //#endregion
    }]);

})();