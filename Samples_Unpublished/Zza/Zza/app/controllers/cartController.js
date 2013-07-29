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
            //don't need remove if item is an entity (e.g, SQL version)
            cartOrder.removeItem(orderItem);
            draftOrder.addItem(orderItem);
        };

        $scope.itemTotal = itemTotal;
        $scope.orderTotal = orderTotal;

        function itemTotal(orderItem) {
            // Todo: move totalling logic into the model
            var toppingPrice = orderItem.productSize.toppingPrice;
            var unitTotal = orderItem.unitPrice;
            orderItem.orderItemOptions.forEach(function (option) {
                option.price = toppingPrice * option.productOption.factor * option.quantity;
                unitTotal += option.price;
            });
            return unitTotal * orderItem.quantity;
        }

        function orderTotal() {
            // Todo: move totalling logic into the model
            return cartOrder.orderItems.reduce(function (p, c) {return p + c;}, 0);
        }
    }

    app.routeResolve[ctrlName] = { dataServiceInit: true };

})();