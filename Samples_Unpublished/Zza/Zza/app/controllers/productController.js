(function() {
    'use strict';

    var ctrlName = 'productCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', '$routeParams', '$location', 'dataservice', 'util', productCtrl]);
    
    function productCtrl($scope, $routeParams, $location, dataservice, util) {
 
        // id may be productId or orderItemId, depending upon route tag
        var tag = $routeParams.tag;
        var id = $routeParams.id;
        var sizes;
        var orderItem;
        var product;
        if (tag == 'item') {
            // reached this page from cart, so id is the orderItemId
            orderItem = getOrderItemById(id);
            if (orderItem) {
                product = orderItem.product;
                tag = product.type;
                sizes = dataservice.productSizes.byProduct(product);
            }
        } else {
            // reached here from product list page, so id is the productId
            product = dataservice.products.byId(id);
            sizes = dataservice.productSizes.byProduct(product);
            orderItem = getOrderItemByProductId(id);
        }

        var cancelUrl = '/order/' + tag;
        if (!product) {
            // bad productId or orderItemId, so go back to list view
            $location.path(cancelUrl); 
            return;
        }

        // preserve the current state to allow later cancel or undo.
        var entitiesToSave = orderItem.orderItemOptions.concat(orderItem);
        var savePoint = dataservice.exportChanges(entitiesToSave);

        var selectedOptionIds = orderItem.orderItemOptions.map(function (o) { return o.productOptionId; });
        var selectedOptions = util.keyArray(orderItem.orderItemOptions, function(o) { return o.productOptionId });
        var productOptions = dataservice.productOptions.byTag(tag);

        // wrap each productOption to provide a 'selected' flag, and a orderItemOption object (if available)
        var selectableOptions = productOptions.map(function (o) { 
            return { option: o, selected: (selectedOptionIds.indexOf(o.id) >= 0), itemOption: (selectedOptions[o.id]) } });

        // group the productOptions by type, so they can be displayed on the tabs
        var optionTypeList = util.groupArray(selectableOptions, function (so) { return so.option.type; }, 'type', 'options');
        var isInCart = (orderItem.order == dataservice.cartOrder);

        $scope.sizes = sizes;
        $scope.product = product;
        $scope.orderItem = orderItem;
        $scope.optionTypes = optionTypeList;
        $scope.segment = util.segmentArray;
        $scope.isInCart = isInCart;
        $scope.selectOption = selectOption;

        // Exposed functions
        $scope.addToCart = function () {
            var orderItem = $scope.orderItem;
            var size = dataservice.productSizes.byId(orderItem.productSizeId);
            orderItem.productSize = size;
            orderItem.unitPrice = size.price;
            orderItem.totalPrice = orderItem.quantity * size.price;

            if (isInCart) {
                util.logger.info("Updated item in cart");
            } else {
                var order = dataservice.cartOrder;
                orderItem.orderId = order.id;
                order.orderItems.push(orderItem);
                util.logger.info("Added item to cart");
            }

            $location.path(cancelUrl);
        }
        $scope.cancel = function () {
            // roll back any changes made by reverting to the savePoint
            dataservice.importChanges(savePoint);
            $location.path(cancelUrl);
        }


        // Private functions

        // Try to find an orderItem on the draft order for the given product.  Create a new orderItem if existing one is not found.
        function getOrderItemByProductId(id) {
            var orderItem;
            var draftOrder = dataservice.draftOrder;

            // Use existing orderItem from draftOrder if available, else create one
            var matching = draftOrder.orderItems.filter(function (item) { return item.productId == id });
            if (matching.length) {
                orderItem = matching[0];
            } else {
                orderItem = dataservice.addOrderItem(draftOrder, product.id);
            }
            orderItem.quantity = orderItem.quantity || 1;
            orderItem.productSizeId = orderItem.productSizeId || sizes[0].id;
            return orderItem;
        }

        // Get the order item by the order item id.  Returns null if not found.
        function getOrderItemById(id) {
            var orderItem;
            var cartOrder = dataservice.cartOrder;
            var draftOrder = dataservice.draftOrder;

            // Try to find the orderItem in the cartOrder, then the draftOrder
            var matching = cartOrder.orderItems.filter(function (item) { return item.id == id });
            if (!matching.length) {
                matching = draftOrder.orderItems.filter(function (item) { return item.id == id });
            }
            if (matching.length) {
                orderItem = matching[0];
            }
            return orderItem;
        }

        // Add/remove orderItemOptions based on what is selected
        /*
        function setOrderItemOptions(orderItem, selectableOptions)
        {
            var selectedOptions = selectableOptions.filter(function (so) { return so.selected; });
            var selectedOptionIds = selectedOptions.map(function (so) { return so.option.id; });
            var oldOptionIds = orderItem.orderItemOptions.map(function (o) { return o.productOptionId; });

            // remove any unselected options
            orderItem.orderItemOptions.forEach(function (io) {
                if (selectedOptionIds.indexOf(io.productOptionId) < 0) {
                    io.entityAspect.setDeleted();
                }
            });

            // add any missing selected options
            selectedOptionIds.forEach(function (id) {
                if (oldOptionIds.indexOf(id) < 0) {
                    dataservice.addOrderItemOption(orderItem, id);
                }
            });

            // update the price
            orderItem.orderItemOptions.forEach(function (io) {
                io.price = orderItem.productSize.toppingPrice * io.productOption.factor;
            });
        }*/

        // Add/remove orderItemOption for a single selection
        function selectOption(selectableOption) {
            var itemOption = selectableOption.itemOption;
            if (selectableOption.selected) {
                if (itemOption) {
                    itemOption.entityAspect.entityState = (itemOption.id < 0) ? EntityState.Added : EntityState.Modified;
                } else {
                    selectableOption.itemOption = itemOption = dataservice.addOrderItemOption(orderItem, selectableOption.option.id);
                }
            } else {
                if (itemOption) {
                    itemOption.entityAspect.setDeleted();
                }
            }
        }
    }
    
    function dataServiceInit(dataservice, logger) {
        logger.log(ctrlName + " is waiting for dataservice init");
        return dataservice.initialize();
    };
    dataServiceInit.$inject = ['dataservice','logger'];
    
    app.routeResolve[ctrlName] = {
        //alert: alert
        dataServiceInit: dataServiceInit
    };
    
    /* Delayed route example
    function alert(q, timeout, window) {
        var deferred = q.defer();
        timeout(function () {
            window.alert("waiting for " + ctrlName);
            deferred.resolve("done");
        }, 0);
        return deferred.promise;
    };
    alert.$inject = ['$q', '$timeout', '$window'];
    */
    
})();