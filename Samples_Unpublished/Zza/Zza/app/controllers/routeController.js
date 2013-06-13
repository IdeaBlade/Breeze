(function() {
    'use strict';

    angular.module('app').controller('routeCtrl',
    ['$scope', '$route', 'routes',
    function ($scope, $route, routes) {

        $scope.current = $route.current;

        // Show links only for routes that have a display name
        $scope.links = routes.navRoutes
            .filter(function (item) { return item.name; });
        
        $scope.$on('$routeChangeSuccess', function () {
            $scope.current = $route.current;
        });
    }]);
    
})();