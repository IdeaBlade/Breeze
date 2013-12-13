app.dataservice = (function (breeze, logger) {


    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);

    //var serviceName = 'breeze/NorthBreeze'; // route to the same origin Web Api controller
    var serviceName = 'breeze/Criteria'; // route to the same origin Web Api controller

    //var manager = new breeze.EntityManager(serviceName);  // gets metadata from /breeze/NorthBreeze/Metadata
    var metadataStore = getMetadataStore();     // gets metadata from metadata.js
    var manager = new breeze.EntityManager({
        serviceName: serviceName,
        metadataStore: metadataStore
    });

    var _isSaving = false;

    return {
        getAllCustomers: getAllCustomers,
        getCustomerPage: getCustomerPage,
        getSimilarCustomersGET: getSimilarCustomersGET,
        getSimilarCustomersPOST: getSimilarCustomersPOST,
        getOrders: getOrders,
        getOrdersTimes100: getOrdersTimes100,
        createCustomer: createCustomer,
        saveChanges: saveChanges
    };

    /*** implementation details ***/

    // Query using GET
    function getSimilarCustomersGET() {
        var query = breeze.EntityQuery.from('SimilarCustomersGET')
                    .withParameters({
                        CompanyName: 'Hilo Hattie', ContactName: 'Donald', City: 'Duck', Country: 'USA', Phone: '808-234-5678' 
                    });

        return manager.executeQuery(query);
    }

    // Query using POST
    function getSimilarCustomersPOST() {
        var query = breeze.EntityQuery.from('SimilarCustomersPOST')
            .withParameters({ 
                $method: 'POST',
                $encoding: 'JSON',
                $data: { CompanyName: 'Hilo Hattie', ContactName: 'Donald', City: 'Duck', Country: 'USA', Phone: '808-234-5678' } 
            });

        return manager.executeQuery(query);
    }



    function getMetadataStore() {
        var store = new breeze.MetadataStore();

        // Import metadata that were downloaded as a script file
        if (!temp || !temp.metadata) {
            throw new Error("'temp.metadata' is not defined; was metadata.js loaded?");
        }
        // Because of Breeze bug, must stringify metadata first.
        store.importMetadata(JSON.stringify(temp.metadata));

        // Associate these metadata data with the service
        // if not already associated
        if (!store.hasMetadataFor(serviceName)) {
            store.addDataService(
                new breeze.DataService({ serviceName: serviceName }));
        }

        // we don't need the app.metadata any more
        temp.metadata = null;

        return store;
    }


    //#region main application operations
    function getAllCustomers() {
        var query = breeze.EntityQuery
                .from("Customers")
                .orderBy("CompanyName").take(10);

        return manager.executeQuery(query);
    }

    function getCustomerPage(skip, take, searchText) {
        var query = breeze.EntityQuery
                .from("Customers")
                .orderBy("CompanyName")
                .skip(skip).take(take)
                .inlineCount(true);
        if (searchText) {
            query = query.where("CompanyName", "contains", searchText);
        }

        return manager.executeQuery(query);
    }

    function getOrders(customer) {
        if (customer) {
            return customer.entityAspect.loadNavigationProperty("Orders");
        }
        else {
            var query = breeze.EntityQuery
                    .from("Orders")
                    .take(50);

            return manager.executeQuery(query);
        }
    }

    function getOrdersTimes100() {
        var query = breeze.EntityQuery
                .from("OrdersTimes100");

        return manager.executeQuery(query);
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
        logger.success("# of entities saved = " + saveResult.entities.length);
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
                "Another user, perhaps the server, may have deleted one or all of the same entities.";
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