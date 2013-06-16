(function () {
    'use strict';
    angular.module('app').factory(
        'dataservice', ['model', 'util', dataservice]);
    
    function dataservice(model, util) {
        var breeze = util.breeze,
            config = util.config,
            logger = util.logger,
            $apply = util.$apply,
            $q = util.$q,
            to$q = util.to$q,
            $timeout = util.$timeout;

        var EntityQuery = breeze.EntityQuery,
            initPromise,
            initFailed,
            manager;

        var products = [],
            productOptions = [],
            orderStatuses = [],
            productSizes = [],
            productsById = {};

        configureBreeze();

        var service = {
            initialize: initialize,
            orderStatuses: orderStatuses,
            products: products,
            productOptions: productOptions,
            productSizes: productSizes,
            productsById: productsById,
            getAllCustomers: getAllCustomers,
            getOrders: getOrders,
            saveChanges: saveChanges
        };
        return service;

        //#region main application operations

        function initialize() {
            if (initPromise && !initFailed) {
                return initPromise; // already initialized/ing
            }
            initFailed = false;

            return initPromise = EntityQuery.from('Lookups')
                .using(manager).execute()
                .then(success).fail(failure)
                .to$q(); // convert Q.js promise to $q promise
            
            function success(data) {
                var result = data.results[0];
                logger.success("Got lookups");
                orderStatuses = result.orderStatuses;
                products = result.products;
                productOptions = result.productOptions;
                productSizes = result.productSizes;
                for (var i = 0, len = products.length; i < len; i++) {
                    productsById[products[i].id] = products[i];
                }

                service.orderStatuses = orderStatuses;
                service.products = products;
                service.productOptions = productOptions;
                service.productSizes = productSizes;
                service.productsById = productsById;
                return true;
            }

            function failure(error) {
                initFailed = true;
                logger.error(error.message, "Data initialization failed");
                throw error; // so downstream fail handlers hear it too
            }           
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


        function saveChanges() {
            return manager.saveChanges()
                .then(saveSucceeded).fail(saveFailed);

            function saveSucceeded(saveResult) {
                logger.success("# of entities saved = " + saveResult.entities.length);
                logger.log(saveResult);
            }

            function saveFailed(error) {
                var msg = 'Save failed: ' + util.getSaveErrorMessages(error);
                error.message = msg;

                logger.error(error, msg);
                // DEMO ONLY: discard all pending changes
                // Let them see the error for a second before rejecting changes
                $timeout(function() {
                    manager.rejectChanges();
                }, 1000);
                throw error; // so caller can see it
            }
        }

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
    }

})();