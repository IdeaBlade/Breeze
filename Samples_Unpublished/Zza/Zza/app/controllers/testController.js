(function() {
    'use strict';

    angular.module('app').controller('testCtrl',
    ['$scope', '$routeParams',
    function ($scope, $routeParams) {
        var orderId = $routeParams.id;
        $scope.orderId = orderId || '<no id>';
    }]);

})();