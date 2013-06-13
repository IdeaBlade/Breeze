(function() {
    'use strict';

    angular.module('app').controller('orderCtrl',
    ['$scope', '$routeParams', 'routes',
    function ($scope, $routeParams, routes) {
 
        // tag comes from nav url; get the current route
        var route = setTaggedRoute($routeParams.tag);
        if (!route) {
            route = setTaggedRoute('pizza');
        }
        $scope.view = route.templateUrl; // view is used in ng-include
        $scope.links = routes.orderRoutes;

        function setTaggedRoute(tag) {
            tag = (tag || 'pizza').toLowerCase();
            $scope.activeTag = tag;
            return routes.orderRoutes.filter(
                function (item) { return item.tag === tag; })[0];
        }
    }]);

})();