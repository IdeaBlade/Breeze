(function () {
    'use strict';

    breeze.config.initializeAdapterInstance("dataService", "mongo", true);

    var app = angular.module('app');

    var environment = {
        server: 'Express',
        serviceName: 'breeze/zza',
        devServiceName: 'breeze/Dev'
    };
    app.constant('environment', environment);



})();