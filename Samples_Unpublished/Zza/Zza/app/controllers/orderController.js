(function() {
    'use strict';

    var ctrlName = 'orderCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', '$routeParams', '$route', 'routes', 'dataservice', orderCtrl]);
    
    function orderCtrl($scope, $routeParams, $route, routes, dataservice) {
 
        // tag comes from nav url; get the current route
        var tag = $routeParams.tag;
        var hasId = !!$routeParams.id;
        var route = setTaggedRoute(tag, hasId) || setTaggedRoute();
        if (!hasId) setProducts();
        $scope.view = route.templateUrl; // view is used in ng-include
        $scope.links = routes.visibleOrderRoutes;
        $scope.cartOrder = dataservice.cartOrder;
        $scope.draftOrder = dataservice.draftOrder;

        function setTaggedRoute(t, hasId) {
            tag = (t || 'pizza').toLowerCase();
            $scope.activeTag = tag;
            var source = hasId ? routes.detailRoutes : routes.orderRoutes;
            return source.filter(
                function (item) { return item.tag === tag })[0];
        }

        function setProducts() {
            var products = dataservice.products.filter(
                function (product) { return product.type == tag; });
            $scope.products = products;
        }
    }
    
    function dataServiceInit(dataservice, logger) {
        logger.log(ctrlName + " is waiting for dataservice init");
        return dataservice.initialize();
    };
    dataServiceInit.$inject = ['dataservice','logger'];
    
    app.routeResolve[ctrlName] = {
        //alert: alert
        dataServiceInit: dataServiceInit
    };
    
    /* Delayed route example
    function alert(q, timeout, window) {
        var deferred = q.defer();
        timeout(function () {
            window.alert("waiting for " + ctrlName);
            deferred.resolve("done");
        }, 0);
        return deferred.promise;
    };
    alert.$inject = ['$q', '$timeout', '$window'];
    */
    
})();