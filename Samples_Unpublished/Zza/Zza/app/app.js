/* 
   This script must run before all others.
   The load order of the other scripts should be immaterial
*/
(function () {
    'use strict';
    
    // Create the 'app' module
    var app = angular.module('app', [
        // Angular modules 
        'ngAnimate',        // animations
        'ngRoute',          // routing
        //'ngSanitize',     // sanitizes html bindings; not using yet

        // 3rd Party Modules
        'ui.bootstrap',     // ui-bootstrap (ex: carousel, pagination, dialog)
        'breeze.directives' // breeze validation directive (zValidate)
    ]);

    app.routeResolve = {};

})();