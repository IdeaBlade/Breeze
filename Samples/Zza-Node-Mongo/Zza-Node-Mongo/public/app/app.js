﻿/* 
   This script must run before all others.
   The load order of the other scripts should be immaterial
*/
(function () {
    'use strict';
    
    // Create the 'app' module
    var app = angular.module('app', ['ui.bootstrap']);

    app.routeResolve = {};

})();