(function() {
    'use strict';

    var ctrlName = 'orderController';
    var app = angular.module('app').controller(ctrlName,
        ['$scope', '$routeParams', '$route', 'routes', 'dataservice', controller]);
    
    function controller($scope, $routeParams, $route, routes, dataservice) {
        var hasId = !!$routeParams.id;
        var route = getTaggedRoute();
        $scope.activeTag = route.tag;
        setProducts();
        $scope.view = route.templateUrl; // view is used in data-ng-include
        $scope.links = routes.visibleOrderRoutes;
        $scope.cartOrder = dataservice.cartOrder;
        $scope.draftOrder = dataservice.draftOrder;

        // get the current route from the nav args
        function getTaggedRoute() {            
            var i, len, pizza, item, result;
            var tag = (($routeParams.tag) || '').toLowerCase();
            var source = hasId ? routes.productOrderRoutes : routes.orderRoutes;
            for (i = 0, len = source.length; i < len; i++) {
                item = source[i];
                if (item.tag === tag) {
                    result = item;
                    break;
                } else if (item.tag === 'pizza') {
                    pizza = item; // default route
                }
            }
            if (!result) {
                if (!pizza) {
                    throw new Error("No matching route and can't default to 'pizza'");
                }
                result = pizza;// fall back to default
            }
            return result;           
        }

        function setProducts() {
            if (hasId) return; // products not needed.
            var tag = $scope.activeTag;
            var products = dataservice.products.filter(
                function (product) { return product.type == tag; });
            $scope.products = products;
        }
    }

    app.routeResolve[ctrlName] = { dataServiceInit: true };
    
})();