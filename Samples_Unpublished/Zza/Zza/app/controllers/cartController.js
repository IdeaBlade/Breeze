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

    function dataServiceInit(dataservice, logger) {
        logger.log(ctrlName + " is waiting for dataservice init");
        return dataservice.initialize();
    };
    dataServiceInit.$inject = ['dataservice', 'logger'];

    app.routeResolve[ctrlName] = {
        dataServiceInit: dataServiceInit
    };

})();