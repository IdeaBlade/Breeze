(function() {
    'use strict';

    angular.module('app').controller('testCtrl',
    ['$scope', '$routeParams', 'dataservice','logger',
    function ($scope, $routeParams, dataservice, logger) {
        logger.log("testCtrl created") ;
        var orderId = $routeParams.id;
        $scope.orderId = orderId || '<no id>';
        $scope.products = dataservice.products;
    }]);

})();