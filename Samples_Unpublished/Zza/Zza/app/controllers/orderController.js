(function() {
    'use strict';

    var ctrlName = 'orderCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', '$routeParams', 'routes', 'dataservice', orderCtrl]);
    
    function orderCtrl($scope, $routeParams, routes, dataservice) {
 
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
    }
    
    function dataServiceInit(dataservice, logger) {
        logger.log(ctrlName + " is waiting for dataservice init");
        return dataservice.afterInit;
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