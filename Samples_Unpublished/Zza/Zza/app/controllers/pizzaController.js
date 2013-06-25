(function() {
    'use strict';

    var ctrlName = 'pizzaCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', '$routeParams', '$location','routes', 'dataservice', 'logger', pizzaCtrl]);
    
    function pizzaCtrl($scope, $routeParams, $location, routes, dataservice, logger) {
 
        // tag comes from nav url; get the current route
        var id = $routeParams.id;
        var product = dataservice.products.byId(id);
        if (!product) {
            $location.url('/order/pizza');// we shouldn't be here
            return;
        }

        var sizes = dataservice.productSizes.byType('pizza');
        $scope.sizes = sizes;
        $scope.product = product;

        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;

        $scope.orderItem = getOrderItem();

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

            $scope.orderItem = getOrderItem();  // old item is in cart, now operate on new item
        }
        $scope.cancel = function () {
            $location.url('/order/pizza');
        }

        // Private functions
        function getOrderItem() {
            var orderItem;

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