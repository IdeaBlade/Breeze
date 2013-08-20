(function() {
    'use strict';
    
    angular.module('app').controller('appController',
        ['$rootScope', 'logger', controller]);
    
    function controller($rootScope, logger) {
        $rootScope.name = "app";
   
        //#region route change event handlers
        $rootScope.$on('$routeChangeError', function (event, current, previous, rejection) {
            var reason = rejection || "failed to change routes";
            logger.log(reason);
        });
        
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            var leaving = current ? "Leaving " + current.path + ". " : "";
            logger.log(leaving + "Going to " + next.path);
        });
        
        $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
            logger.log("Route change succeeded; arriving at " + current.path);
        });
        
        $rootScope.$on('$routeUpdate', function (event) {
            logger.log("Reloading the route with different query params, keeping the same controller instance");
        });
        //#endregion
    }
})();
