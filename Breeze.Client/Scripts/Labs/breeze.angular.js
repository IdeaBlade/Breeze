/*
 * Breeze Angular Module and "breeze service"
 *
 * v.0.8.1
 *
 * The beginnings of a "breeze service"
 * 
 * At the moment, all it does is configure breeze for an Angular application
 * Tells Breeze to use $q for its promises rather than Q.js
 * Tells Breeze to use $http for AJAX calls.
 * Consequently Breeze no longer requires the jQuery or the Q.js libraries
 * (although non-Breeze code in your app may require either or both).
 * 
 * At the moment you don't really need the 'breeze' service itself because 
 * 'breeze' is in the global 'window' namespace.
 *
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.  
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Author: Ward Bell
 *
 * Install:
 *   1) load this script after the breeze script (e.g. breeze.debug.js)
 *   2) make your app module depend upon the 'breeze.angular' module
 *   3) ensure some component depends on 'breeze' service before calling a breeze function, 
 * --------------------------------------------
 * Example #1: Configure when app boots
 * 
 * var app = angular.module('app', [
 *     // ... other dependencies ...
 *     'breeze.angular' // the breeze service module
 * ]);
 * 
 * // Ensure that breeze is minimally configured by loading it when app runs
 * app.run(['breeze', function (breeze) { }]); // do nothing but you could
 * 
 * --------------------------------------------
 * Example #2: Configure on first use of breeze
 * 
 * var app = angular.module('app', [
 *     // ... other dependencies ...
 *     'breeze.angular' // the breeze service module
 * ]);
 * 
 * // Any first use of breeze would involve the breeze.EntityManager.
 * // 'entityManagerFactory' configures a new EntityManager for the app
 * angular.module('app').factory('entityManagerFactory', ['breeze', emFactory]);
 *
 * function emFactory(breeze) {
 *   // Convert properties between server-side PascalCase and client-side camelCase
 *   breeze.NamingConvention.camelCase.setAsDefault();
 * 
 *   // Identify the endpoint for the remote data service
 *   var serviceRoot = window.location.protocol + '//' + window.location.host + '/';
 *   var serviceName = serviceRoot + 'breeze/breeze'; // breeze Web API controller
 * 
 *   var factory = {
 *     newManager: function() {return new breeze.EntityManager(serviceName);},
 *     serviceName: serviceName
 *   };
 *
 *   return factory;
 * }
 */
(function () {
    'use strict';
    angular.module('breeze.angular', [])
        .factory('breeze', ['$http', '$q', ngBreeze]);
        
    function ngBreeze($http, $q) {
        useNgHttp();
        useNgModelLibrary();
        useNgPromises();
        return breeze;

        /* implementation */
        function useNgHttp() {
            // configure breeze to use Angular's $http ajax adapter
            var ajax = breeze.config.initializeAdapterInstance('ajax', 'angular', true);
            ajax.setHttp($http); // use this app's $http instance           
        }

        function useNgModelLibrary() {
            // config breeze to use the native 'backingStore' modeling adapter appropriate
            //  for AngularJS vs. one appropriate for KnockoutJS
            //    This adapter is the Breeze default when it detects that KnockoutJS is absent
            //    so we set it here ONLY to be explicit.
            breeze.config.initializeAdapterInstance('modelLibrary', 'backingStore', true);
        }

        function useNgPromises() {
            // Todo: use promise adapter after Breeze makes it available
            breeze.Q = $q; // HACK ... until dependencies can get it another way

            if (breeze.config.setQ) {
                breeze.config.setQ($q);
                // add class methods that Breeze wants that $q lacks 
                $q.resolve = $q.fcall = $q.when;           
            } else {
                throw new Error(
                    'Cannot use the breeze angular service with breeze.version=' + breeze.version);
            }
        }
    }

})();