(function () {
    'use strict';

    breeze.config.initializeAdapterInstance("dataService", "mongo", true);
    setNamingConvention();

    var app = angular.module('app');

    var environment = {
        server: 'Express',
        serviceName: 'breeze/zza',
        devServiceName: 'breeze/Dev'
    };
    app.constant('environment', environment);

    function setNamingConvention() {
        // Translate certain zza property names between MongoDb names and client names
        var convention = new breeze.NamingConvention({
            serverPropertyNameToClient: function(serverPropertyName) {
                switch (serverPropertyName) {
                    case '_id':   return 'id';
                    case 'qty':   return 'quantity';
                    case 'optionId':   return 'productOptionId';
                    case 'sizeId':   return 'productSizeId';
                    default: return serverPropertyName;
                }
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                switch (clientPropertyName) {
                    case 'id':   return '_id';
                    case 'quantity':   return 'qty';
                    case 'productOptionId':   return 'optionId';
                    case 'productSizeId':   return 'sizeId';
                    default: return clientPropertyName;
                }
            }
        });
        convention.setAsDefault();
    }

})();