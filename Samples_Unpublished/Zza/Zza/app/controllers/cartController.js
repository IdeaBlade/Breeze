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
        $scope.someCostMore = false;
        $scope.recalc = recalc;
        
        recalc();
        
        function recalc() {
            pricing.calcOrderItemsTotal(cartOrder);
            $scope.someCostMore = pricing.orderHasExtraCostOptions(cartOrder);
        }
               
        function removeItem(orderItem) {
            //don't need to remove if item is an entity (e.g, SQL version)
            cartOrder.removeItem(orderItem);
            draftOrder.addItem(orderItem);
            recalc();
        }
    }

    app.routeResolve[ctrlName] = { dataServiceInit: true };

})();