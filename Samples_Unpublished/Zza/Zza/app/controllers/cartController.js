(function() {
    'use strict';

    var ctrlName = 'cartCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', 'dataservice', cartCtrl]);
    
    function cartCtrl($scope, dataservice) {
        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;
        $scope.cartOrder = cartOrder;

        $scope.removeItem = function (orderItem) {
            orderItem.order = draftOrder;
        };

        $scope.itemTotal = itemTotal;
        $scope.orderTotal = orderTotal;

        function itemTotal(orderItem) {
            var unitTotal = orderItem.unitPrice;
            orderItem.orderItemOptions.forEach(function (option) {
                option.price = orderItem.productSize.toppingPrice * option.productOption.factor * option.quantity;
                unitTotal += option.price;
            });
            return unitTotal * orderItem.quantity;
        }

        function orderTotal() {
            var orderTotal = 0;
            cartOrder.orderItems.forEach(function(item) {
                orderTotal += itemTotal(item);
            });
            return orderTotal;
        }
    }

    function dataServiceInit(dataservice, logger) {
        logger.log(ctrlName + " is waiting for dataservice init");
        return dataservice.initialize();
    };
    dataServiceInit.$inject = ['dataservice', 'logger'];

    app.routeResolve[ctrlName] = {
        dataServiceInit: dataServiceInit
    };

})();