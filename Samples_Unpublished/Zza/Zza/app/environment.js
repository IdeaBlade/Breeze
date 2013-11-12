(function () {
    'use strict';

    breeze.NamingConvention.camelCase.setAsDefault();

    var app = angular.module('app');
    var serviceRoot = window.location.protocol + '//' + window.location.host + '/';

    var environment = {
        server: 'IIS',
        serviceRoot: serviceRoot,
        serviceName: 'breeze/ZzaEf',
        devServiceName: 'breeze/Dev'
    };
    app.constant('environment', environment);

})();