(function() {
    'use strict';
    
    angular.module('app').controller('appCtrl',
    ['$rootScope', function ($rootScope) {

        $rootScope.$on('$routeChangeError', function (event, current, previous, rejection) {
            var reason = rejection || "failed to change routes";
            console.log(reason);
        });
        
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            var leaving = current ? "Leaving " + current.path + ". " : "";
            console.log(leaving + "Going to "+next.path);
        });
        
        $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
            console.log("Route change succeeded; arriving at " + current.path);
        });
        
        $rootScope.$on('$routeUpdate', function (event) {
            console.log("Reloading the route with different query params, keeping the same controller instance");
        });
    }]);
})();
