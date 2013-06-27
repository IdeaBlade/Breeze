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

        var optionTypeList = getProductOptions(tag);

        $scope.sizes = sizes;
        $scope.product = product;
        $scope.orderItem = orderItem;
        $scope.optionTypes = optionTypeList;
        $scope.segment = util.segmentArray;

        // Exposed functions
        $scope.addToCart = function () {
            var orderItem = $scope.orderItem;
            var size = dataservice.productSizes.byId(orderItem.productSizeId);
            orderItem.productSize = size;
            orderItem.unitPrice = size.price;
            orderItem.totalPrice = orderItem.quantity * size.price;

            var order = dataservice.cartOrder;
            orderItem.orderId = order.id;
            order.orderItems.push(orderItem);
            logger.info("Added item to cart");

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
                orderItem = dataservice.createOrderItem();
                orderItem.productId = product.id;
                draftOrder.orderItems.push(orderItem);
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

        // Get the product options, grouped by option type.
        function getProductOptions(tag) {
            if (tag == 'beverage') return [];
            var options = dataservice.productOptions;

            var isPizza = (tag == 'pizza');
            var isSalad = (tag == 'salad');
            var optionTypeMap = {};
            var optionTypeList = [];
            options.forEach(function (o) {
                if ((o.isPizzaOption != isPizza) && (o.isSaladOption != isSalad)) return;
                var type = o.type;
                var optionTab = optionTypeMap[type];
                if (!optionTab) {
                    optionTab = { type: type, options: [] };
                    optionTypeMap[type] = optionTab;
                    optionTypeList.push(optionTab);
                }
                optionTab.options.push({ option: o, selected: false });
            });
            return optionTypeList;
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