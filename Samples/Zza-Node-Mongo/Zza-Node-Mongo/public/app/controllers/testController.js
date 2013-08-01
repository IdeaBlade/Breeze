(function() {
    'use strict';

    angular.module('app').controller('testController',
    ['$scope', '$routeParams', 'dataservice','logger', testController]);
    
    function testController($scope, $routeParams, dataservice, logger) {
        logger.log("testController created") ;
        var orderId = $routeParams.id;
        $scope.orderId = orderId || '<no id>';
        $scope.products = dataservice.products;
    };

})();