'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('Zza', []);

app.routes = [
    { path: '/', name: 'Home', templateUrl: 'App/views/home.html', controller: 'HomeCtrl' },
    { path: '/customers', name: 'Customers', templateUrl: 'App/views/customers.html', controller: 'CustomerCtrl' },
    { path: '/orders', name: 'Orders', templateUrl: 'App/views/orders.html', controller: 'OrderCtrl' }
];

app.config(['$routeProvider', function ($routeProvider) {

    var len = app.routes.length;
    for (var i = 0; i < len; i++) {
        var rt = app.routes[i];
        $routeProvider.when(rt.path, rt);
    }
    $routeProvider.otherwise({ redirectTo: '/' });
}]);