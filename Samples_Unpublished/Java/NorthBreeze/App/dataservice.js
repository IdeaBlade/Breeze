'use strict';
(function() {
	angular.module('app').factory("dataservice", ['logger', '$http', function (logger, $http) {

	    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true); // backingStore is the modelLibrary for Angular

	    var serviceName = 'breeze/northbreeze'; // route to the (same origin) Web Api controller

	    var manager = new breeze.EntityManager(serviceName);  // gets metadata from /breeze/NorthBreeze/Metadata

	    var _isSaving = false;

	    return {
	        getAllCustomers: getAllCustomers,
	        getCustomerPage: getCustomerPage,
	        getOrderPage: getOrderPage,
	        getOrders: getOrders,
	        createCustomer: createCustomer,
	        getChanges: getChanges,
	        subscribeChanges: subscribeChanges,
	        saveChanges: saveChanges,
	        rejectChanges: rejectChanges
	    };

	    /*** implementation details ***/

	    //#region main application operations
	    function getAllCustomers() {
	        var query = breeze.EntityQuery
	                .from("Customers")
	                .orderBy("companyName").take(10);

	        return manager.executeQuery(query);
	    }

	    function getCustomerPage(skip, take, searchText) {
	        var query = breeze.EntityQuery
	                .from("Customers")
	                .orderBy("companyName")
	                .skip(skip).take(take)
	                .inlineCount(true);
	        if (searchText) {
	            query = query.where("companyName", "contains", searchText);
	        }

	        return manager.executeQuery(query);
	    }

	    function getOrderPage(skip, take) {
	        var query = breeze.EntityQuery
	                .from("Orders")
	                .skip(skip).take(take)
	                .inlineCount(true);
	        return manager.executeQuery(query);
	    }
	    
	    function getOrders(customer) {
	        if (customer) {
	            return customer.entityAspect.loadNavigationProperty("orders");
	        }
	        else {
	            var query = breeze.EntityQuery
	                    .from("Orders")
	                    .take(2).inlineCount(true);
	            

	            return manager.executeQuery(query);
	        }
	    }

	    function createCustomer() {
	        return manager.createEntity("Customer");
	    }

	    // return an array of entities that have changes
	    function getChanges(entityType) {
	        return manager.getChanges(entityType);
	    }

	    // subscribe to the entityChanged event
	    function subscribeChanges(callback) {
	        manager.entityChanged.subscribe(callback);
	    }

	    function rejectChanges() {
	        manager.rejectChanges();
	    }

	    function saveChanges(entities) {
	        if (manager.hasChanges()) {
	            if (_isSaving) {
	                setTimeout(saveChanges, 50);
	                return;
	            }
	            _isSaving = true;
	            manager.saveChanges(entities)
	                .then(saveSucceeded)
	                .fail(saveFailed)
	                .fin(saveFinished);
	        } else if (!suppressLogIfNothingToSave) {
	            logger.info("Nothing to save");
	        };
	    }
	    
	    
	    // Private Functions
	    function saveSucceeded(saveResult) {
	        logger.success("# of entities saved = " + saveResult.entities.length);
	        logger.log(saveResult);
	    }

	    function saveFailed(error) {
	        var reason = error.message;
	        var detail = error.detail;
	        var entityErrors = error.entityErrors;

	        if (entityErrors && entityErrors.length) {
	            handleSaveValidationError(entityErrors);
	            return;
	        }
	        if (detail && detail.ExceptionType &&
	            detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
	            // Concurrency error
	            reason =
	                "Another user, perhaps the server, may have deleted one or all of the same entities.";
	            manager.rejectChanges(); // DEMO ONLY: discard all pending changes
	        }

	        logger.error(error,
	            "Failed to save changes. " + reason +
	            " You may have to restart the app.");
	    };

	    function saveFinished() { _isSaving = false; }

	    function handleSaveValidationError(entityErrors) {
	        // http://www.breezejs.com/documentation/server-side-validation
	        var message = "Not saved due to validation errors";
	        try { // fish out the first error
	            var messages = entityErrors.map(function (er) {
	                return er.errorMessage;
	            });
	            message += ": " + messages.join(';\n');
	        } catch (e) { /* eat it for now */ }
	        logger.error(message);
	    }

	    //#endregion


	}]);	
})();
