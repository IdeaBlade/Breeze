(function() {
    'use strict';

    var ctrlName = 'cartController';
    var app = angular.module('app').controller(ctrlName,
        ['$scope', 'dataservice', controller]);
    
    function controller($scope, dataservice) {
        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;
        $scope.cartOrder = cartOrder;

        $scope.removeItem = function (orderItem) {
            draftOrder.orderItems.push(orderItem);
        };

        $scope.itemTotal = itemTotal;
        $scope.orderTotal = orderTotal;

        function itemTotal(orderItem) {
            // Todo: move totalling logic into the model
            var total = orderItem.unitPrice;
            orderItem.orderItemOptions.forEach(function (option) {
                option.price = orderItem.productSize.toppingPrice * option.productOption.factor * option.quantity;
                total += option.price;
            });
            return total * orderItem.quantity;
        }

        function orderTotal() {
            // Todo: move totalling logic into the model
            var total = 0;
            cartOrder.orderItems.forEach(function(item) {
                total += itemTotal(item);
            });
            return total;
        }
    }

    app.routeResolve[ctrlName] = { dataServiceInit: true };

})();