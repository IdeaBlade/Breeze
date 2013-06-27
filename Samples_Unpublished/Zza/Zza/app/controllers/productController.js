(function() {
    'use strict';

    var ctrlName = 'productCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', '$routeParams', '$location', 'routes', 'dataservice', 'logger', 'util', productCtrl]);
    
    function productCtrl($scope, $routeParams, $location, routes, dataservice, logger, util) {
 
        // id may be productId or orderItemId, depending upon route tag
        var tag = $routeParams.tag;
        var id = $routeParams.id;
        var sizes;
        var orderItem;
        var product;
        if (tag == 'item') {
            orderItem = getOrderItemById(id);
            if (orderItem) {
                product = orderItem.product;
                tag = product.type;
                sizes = dataservice.productSizes.byType(product.type);
            }
        } else {
            product = dataservice.products.byId(id);
            sizes = dataservice.productSizes.byType(product.type);
            orderItem = getOrderItemByProductId(id);
        }

        if (!product) {
            $location.url('/order/pizza');// we shouldn't be here
            return;
        }

        var selectedOptionIds = orderItem.orderItemOptions.map(function (o) { return o.productOptionId; });
        var productOptions = dataservice.productOptions.byTag(tag);
        var selectableOptions = productOptions.map(function (o) { return { option: o, selected: (selectedOptionIds.indexOf(o.id) >= 0) } });
        var optionTypeList = util.groupArray(selectableOptions, function (so) { return so.option.type; }, 'type', 'options');
        var isInCart = (orderItem.order == dataservice.cartOrder);

        $scope.sizes = sizes;
        $scope.product = product;
        $scope.orderItem = orderItem;
        $scope.optionTypes = optionTypeList;
        $scope.segment = util.segmentArray;
        $scope.isInCart = isInCart;

        // Exposed functions
        $scope.addToCart = function () {
            var orderItem = $scope.orderItem;
            var size = dataservice.productSizes.byId(orderItem.productSizeId);
            orderItem.productSize = size;
            orderItem.unitPrice = size.price;
            orderItem.totalPrice = orderItem.quantity * size.price;

            setOrderItemOptions(orderItem, selectableOptions);

            if (isInCart) {
                logger.info("Updated item in cart");
            } else {
                var order = dataservice.cartOrder;
                orderItem.orderId = order.id;
                order.orderItems.push(orderItem);
                logger.info("Added item to cart");
            }

            $location.url('/order/pizza');
        }
        $scope.cancel = function () {
            $location.url('/order/pizza');
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
            orderItem.productSizeId = orderItem.productSizeId || sizes[1].id;
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