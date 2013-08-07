(function() {
    'use strict';

    var ctrlName = 'cartController';
    var app = angular.module('app').controller(ctrlName,
        ['$scope', 'dataservice', 'pricing', controller]);
    
    function controller($scope, dataservice, pricing) {
        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;

        $scope.cartOrder = cartOrder;
        $scope.removeItem = removeItem;
        $scope.calc = calc;
        
        calc();
        
        function calc() {
            var haveItems = $scope.haveItems = cartOrder.orderItems.length;
            if (haveItems){
                pricing.calcOrderItemsTotal(cartOrder);
                $scope.someCostMore = pricing.orderHasExtraCostOptions(cartOrder);
            }
        }
               
        function removeItem(orderItem) {
            //don't need to remove if item is an entity (e.g, SQL version)
            cartOrder.removeItem(orderItem);
            draftOrder.addItem(orderItem);
            calc();
        }
    }

    app.routeResolve[ctrlName] = { dataServiceInit: true };

})();