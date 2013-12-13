(function () {
    'use strict';

    breeze.config.initializeAdapterInstance("dataService", "mongo", true);
    setNamingConvention();

    var app = angular.module('app');
    var serviceRoot = window.location.protocol + '//' + window.location.host + '/';

    var environment = {
        server: 'Express',
        serviceRoot: serviceRoot,
        serviceName: 'breeze/zza',
        devServiceName: 'breeze/dev'
    };

    app.constant('environment', environment);

    function setNamingConvention() {
        // Translate certain zza property names between MongoDb names and client names
        var convention = new breeze.NamingConvention({
            name: 'mongo-naming-convention',
            serverPropertyNameToClient: function(serverPropertyName) {
                switch (serverPropertyName) {
                    case '_id':   return 'id';
                    case 'qty':   return 'quantity';
                    case 'optionId':   return 'productOptionId';
                    case 'sizeId':   return 'productSizeId';
                    case 'items':   return 'orderItems';
                    case 'options':   return 'orderItemOptions';
                    default: return serverPropertyName;
                }
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                switch (clientPropertyName) {
                    case 'id':   return '_id';
                    case 'quantity':   return 'qty';
                    case 'productOptionId':   return 'optionId';
                    case 'productSizeId':   return 'sizeId';
                    case 'orderItems':   return 'items';
                    case 'orderItemOptions':   return 'options';
                    default: return clientPropertyName;
                }
            }
        });
        convention.setAsDefault();
    }

})();