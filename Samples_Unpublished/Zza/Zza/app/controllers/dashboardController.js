(function() {
    'use strict';

    var ctrlName = 'dashboardController';
    angular.module('app').controller(ctrlName,
        ['$scope', 'routes', 'dataservice', controller]);
    
    function controller($scope, routes, dataservice) {
        $scope.productLinks = routes.orderProductRoutes;
        $scope.cartOrder = dataservice.cartOrder;
        $scope.draftOrder = dataservice.draftOrder;
    }   
})();