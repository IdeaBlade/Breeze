/* 
   This script must run before all others.
   The load order of the other scripts is immaterial
*/
(function () {
    'use strict';
    
    // Declare app level module which depends on filters, and services
    var app = angular.module('app', []);
    
    // Make selected global libraries available as injectables
    app.value('breeze', window.breeze);
    app.value('toastr', window.toastr);

    app.routeResolve = {};
})();