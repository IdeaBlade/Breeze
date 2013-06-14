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
            $timeout = util.$timeout;

        var EntityQuery = breeze.EntityQuery,
            afterInitDeferred = $q.defer(),
            manager;

        var afterInit = afterInitDeferred.promise,
            products = [],
            productOptions = [],
            orderStatuses = [],
            productSizes = [];

        configureBreeze();

        var service = {
            afterInit: afterInit,
            initialize: initialize,
            orderStatuses: orderStatuses,
            products: products,
            productOptions: productOptions,
            productSizes: productSizes,
            getAllCustomers: getAllCustomers,
            getOrders: getOrders,
            saveChanges: saveChanges
        };
        return service;

        //#region main application operations

        function initialize() {
            EntityQuery.from('Lookups').using(manager)
                .execute().then(gotLookups).fail(initFailed);

            function gotLookups(data) {
                var result = data.results[0];
                logger.success("Got lookups");
                orderStatuses = result.orderStatuses;
                products = result.products;
                productOptions = result.productOptions;
                productSizes = result.productSizes;
                $apply(afterInitDeferred.resolve);
            }

            function initFailed(error) {
                logger.error(error.message, "Data initialization failed");
                $apply(afterInitDeferred.reject);
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