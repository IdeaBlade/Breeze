/***
 * Service: entityManagerFactory 
 *
 * Configures BreezeJS and creates new instance(s) of the 
 * BreezeJS EntityManager for use in a 'datacontext' service
 *
 ***/
(function () {
    'use strict';
    
    var serviceId = 'entityManagerFactory';
    angular.module('app')
           .factory(serviceId, ['breeze', emFactory]);

    function emFactory(breeze) {
        configureBreeze();
        var serviceRoot = window.location.protocol + '//' + window.location.host + '/';
        var serviceName = serviceRoot + 'odata/';
        var factory = {
            newManager: newManager,
            serviceName: serviceName
        };

        return factory;

        function configureBreeze() {           
            // use Web API OData to query and save
            breeze.config.initializeAdapterInstance('dataService', 'webApiOData', true);

            // convert between server-side PascalCase and client-side camelCase
            breeze.NamingConvention.camelCase.setAsDefault();
        }

        function newManager() {
            var mgr = new breeze.EntityManager(serviceName);
            return mgr;
        }


    }
})();