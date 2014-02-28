/***
 * App module: app 
 *
 * Bootstrap the app.
 *
 ***/
(function () {
    'use strict';

    angular.module('app', [
        // Angular modules 
        'ngAnimate',        // Angular animations

        // Breeze Modules
        'breeze.angular',   // Breeze service
        'breeze.directives' // Breeze validation directive (zValidate)
    ]); 
})();