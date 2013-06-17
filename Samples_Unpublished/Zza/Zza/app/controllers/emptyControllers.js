(function() {
    'use strict';
    angular.module('app')
        .controller('homeCtrl', function($scope) { $scope.name = "home"; })
        .controller('cartCtrl', function($scope) { $scope.name = "cart"; });
})();
