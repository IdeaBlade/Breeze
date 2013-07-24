// ReSharper disable AssignedValueIsNeverUsed
(function () {
    'use strict';
    angular.module('app').factory(
        'dataservice', ['entityManagerProvider', 'model', 'util', dataservice]);

    function dataservice(entityManagerProvider, model, util) {
        var breeze = util.breeze,
            config = util.config,
            logger = util.logger,
            $timeout = util.$timeout;

        var EntityQuery = breeze.EntityQuery,
            initPromise,
            initFailed;

        var manager = entityManagerProvider.newManager();

        var service = {
            initialize: initialize,
            initializeSynchronously: initializeSynchronously, // testing only?
            saveChanges: saveChanges,
            resetManager: resetManager,
        /* These are added during initialization:
               cartOrder,
               draftOrder,
               orderStatuses,
               products,
               productOptions,
               productSizes
             */
        };
        return service;

        //#region implementation
        function initialize() {
            if (initPromise && !initFailed) {
                return initPromise; // already initialized/ing
            }
            initFailed = false;

            return initPromise = fetchLookups()
                .then(success).fail(failure).to$q();
                // .to$q converts Q.js promise to $q promise

            function success() {
                initializeSynchronously();
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
                manager.getEntities('OrderStatus').length) {
                logger.info("Lookups loaded from cache.");
                return Q(true);
            }
            // have to get them from the server
            return EntityQuery.from('Lookups').using(manager).execute()
                .then(function () {
                    logger.info("Lookups loaded from server.");
                });
        }
        
        // Currently called only during testing
        function initializeSynchronously() {
            setServiceLookups();
            createDraftAndCartOrders();
            initPromise = Q(true).to$q();
        }
        
        function setServiceLookups() {
            if (service.OrderStatus) { return; } // already set

            // set service lookups from  lookup data in cache         
            service.OrderStatus = {};
            service.OrderStatus.statuses = manager.getEntities('OrderStatus');
            service.products = manager.getEntities('Product');
            service.productOptions = manager.getEntities('ProductOption');
            service.productSizes = manager.getEntities('ProductSize');
            extendLookups();
        }

        function extendLookups() {
            var u = util, s = service, os = s.OrderStatus; // for brevity

            os.byId = u.filterById(os.statuses);
            os.byName = u.filterByName(os.statuses);

            // OrderStatus enums               
            os.Ordered = os.byName(/Ordered/i)[0];
            os.PickedUp = os.byName(/PickedUp/i)[0];
            os.Delivered = os.byName(/Delivered/i)[0];
            os.Cancelled = os.byName(/Cancelled/i)[0];
            os.Pending = os.byName(/Pending/i)[0];

            s.products.byId = u.filterById(s.products);
            s.products.byType = u.filterByType(s.products);
            s.products.byName = u.filterByName(s.products);

            s.productSizes.byId = u.filterById(s.productSizes);
            s.productSizes.byType = u.filterByType(s.productSizes);
            s.productSizes.byProduct = filterByProduct(s.productSizes);

            s.productOptions.byId = u.filterById(s.productOptions);
            s.productOptions.byType = u.filterByType(s.productOptions);
            s.productOptions.byTag = filterByTag(s.productOptions);
            s.productOptions.byProduct = filterOptionsByProduct(s.productOptions);

        }

        function filterByProduct(productSizes) {
            return function (product) {
                var sizeIds = product.sizeIds;
                var type = product.type;
                if (sizeIds) {
                    // sizeIds is in the form "'10,11,12'"
                    var sizeArr = sizeIds.slice(1, -1).split(',');
                    var intArr = sizeArr.map(function (s) { return parseInt(s); });
                    return productSizes.filter(function (o) {
                        return (o.type == type) && (intArr.indexOf(o.id) >= 0);
                    });
                } else {
                    return productSizes.filter(function (o) { return o.type == type; });
                }
            };
        }

        function filterByTag(productOptions) {
            return function (tag) {
                if (tag == 'pizza') {
                    return productOptions.filter(function (o) { return o.isPizzaOption; });
                } else if (tag == 'salad') {
                    return productOptions.filter(function (o) { return o.isSaladOption; });
                }
                return [];  // beverage tag has no options
            };
        }
        
        function filterOptionsByProduct(productOptions){
            return function (product) {
                var type = product.type;
                if (type == 'pizza') {
                    if (product.hasOptions) {
                        return productOptions.filter(function(o) { return o.isPizzaOption;});
                    } else {
                        // even pizza without options has crust and spice options
                        return productOptions.filter(
                            function (o) { return o.isPizzaOption &&
                                          (o.type === "crust" || o.type === "spice");});
                    }
                } else if (type == 'salad') {
                    return productOptions.filter(function(o) { return o.isSaladOption; });
                }
                return [];  // beverage tag has no options
            };
        }

        function createDraftAndCartOrders() {
            var orderInit = { orderStatusId: service.OrderStatus.Pending.id};
            service.cartOrder = model.Order.create(manager, orderInit);
            service.draftOrder = model.Order.create(manager, orderInit);
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
        
        // Should be in Breeze itself
        function attachEntities(entities, entityState) {
            entities.forEach(function (entity) { manager.attachEntity(entity, entityState); });
        }
        //#endregion

    }
})();