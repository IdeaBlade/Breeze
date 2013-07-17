(function () {
    'use strict';

    var app = angular.module('app');

    var environment = {
        server: 'IIS',
        serviceName: 'breeze/ZzaEf',
        devServiceName: 'breeze/Dev'
    };
    app.constant('environment', environment);

})();