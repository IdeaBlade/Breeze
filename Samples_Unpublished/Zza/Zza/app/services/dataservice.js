// ReSharper disable AssignedValueIsNeverUsed
(function () {
    'use strict';
    angular.module('app').factory(
        'dataservice', ['entityManagerProvider', 'util', dataservice]);

    function dataservice(entityManagerProvider, util) {
        var breeze = util.breeze,
            config = util.config,
            logger = util.logger,
            $apply = util.$apply,
            $q = util.$q,
            to$q = util.to$q,
            $timeout = util.$timeout;

        var EntityQuery = breeze.EntityQuery,
            initPromise,
            initFailed;

        var manager = entityManagerProvider.manager;

        var service = {
            // more members added during initialization
            initialize: initialize,
            getAllCustomers: getAllCustomers,
            getOrders: getOrders,
            saveChanges: saveChanges,
            resetManager: resetManager
        };
        return service;

        //#region implementation

        function initialize() {
            if (initPromise && !initFailed) {
                return initPromise; // already initialized/ing
            }
            initFailed = false;

            return initPromise = fetchLookups()
                .then(success).fail(failure)
                .to$q(); // convert Q.js promise to $q promise

            function success() {
                setServiceLookups();
                createDraftAndCartOrders();
                return true;
            }

            function failure(error) {
                initFailed = true;
                logger.error(error.message, "Data initialization failed");
                throw error; // so downstream fail handlers hear it too
            }
        }
        
        function fetchLookups() {
            // if OrderStatuses in cache -> assume all lookups in cache
            if (manager.metadataStore.hasMetadataFor(config.serviceName) &&
                manager.getEntities('OrderStatus').length) { return Q(true); }
            // have to get them from the server
            return EntityQuery.from('Lookups').using(manager).execute();
        }
        
        function setServiceLookups() {
            if (service.OrderStatus) { return; } // already set
            
            // set service lookups from  lookup data in cache         
            service.OrderStatus = {};
            service.OrderStatus.statuses = manager.getEntities('OrderStatus');
            service.products = manager.getEntities('Product');
            service.productOptions = manager.getEntities('ProductOption');
            service.productSizes = manager.getEntities('ProductSize');
            extendLookups(); // with functions
        }
        
        function extendLookups() {
            var u = util, s = service, os = s.OrderStatus; // for brevity

            os.byId = u.filterById(os.statuses);
            os.byName = u.filterByName(os.statuses);

            // OrderStatus enums               
            os.Ordered = os.byName(/Ordered/i);
            os.PickedUp = os.byName(/PickedUp/i);
            os.Delivered = os.byName(/Delivered/i);
            os.Cancelled = os.byName(/Cancelled/i);
            os.Pending = os.byName(/Pending/i);

            s.products.byId = u.filterById(s.products);
            s.products.byType = u.filterByType(s.products);
            s.products.byName = u.filterByName(s.products);
            s.productSizes.byId = u.filterById(s.productSizes);
            s.productSizes.byType = u.filterByType(s.productSizes);
            s.productOptions.byId = u.filterById(s.productOptions);
            s.productOptions.byType = u.filterByType(s.productOptions);
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

        // Reset the manager to its base state
        // Clears the manager, re-populates with the lookups
        // Creates a new draftOrder and cartOrder
        function resetManager() {
            manager.clear(); // detaches everything
            attachEntities(service.OrderStatus.statuses);
            attachEntities(service.products);
            attachEntities(service.productOptions);
            attachEntities(service.productSizes);
            createDraftAndCartOrders();
        }
        function createDraftAndCartOrders() {
            var orderInit = {
                customerId: util.emptyGuid,
                orderStatusId: service.OrderStatus.Pending,
                orderDate: new Date(),
                deliveryDate: new Date()
            };
            service.cartOrder = manager.createEntity('Order', orderInit);
            service.draftOrder = manager.createEntity('Order', orderInit);
        }
        
        // Should be in Breeze itself
        function attachEntities(entities, entityState) {
            entities.forEach(function (entity) { manager.attachEntity(entity, entityState); });
        }
        //#endregion

    }
})();