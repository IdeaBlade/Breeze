(function() {
    'use strict';

    var ctrlName = 'cartCtrl';
    var app = angular.module('app').controller(
        ctrlName, ['$scope', 'dataservice', cartCtrl]);
    
    function cartCtrl($scope, dataservice) {
        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;
        $scope.cartOrder = cartOrder;

        $scope.removeItem = function (orderItem) {
            orderItem.order = draftOrder;
        };
    }

    function dataServiceInit(dataservice, logger) {
        logger.log(ctrlName + " is waiting for dataservice init");
        return dataservice.initialize();
    };
    dataServiceInit.$inject = ['dataservice', 'logger'];

    app.routeResolve[ctrlName] = {
        dataServiceInit: dataServiceInit
    };

})();