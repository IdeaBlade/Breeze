(function() {
    'use strict';

    var ctrlName = 'pizzaCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', '$routeParams', '$location','routes', 'dataservice', pizzaCtrl]);
    
    function pizzaCtrl($scope, $routeParams, $location, routes, dataservice) {
 
        // tag comes from nav url; get the current route
        var id = $routeParams.id;
        var product = dataservice.products.byId(id);
        if (!product) {
            $location.url('/order/pizza');// we shouldn't be here
            return;
        }

        $scope.product = product;

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