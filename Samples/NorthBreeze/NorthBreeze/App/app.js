'use strict';

// Declare app level module which depends ngGrid
var app = angular.module('NorthBreeze', ['ngGrid']);

// Define route objects, which are used by the routeProvider (for loading ng-view) and by the RouteCtrl (for displaying navigation bar)
app.routes = [
    { path: '/', name: 'Home', templateUrl: 'App/views/home.html', controller: 'HomeCtrl' },
    { path: '/customers', name: 'Customers', templateUrl: 'App/views/customers.html', controller: 'CustomerCtrl' },
    { path: '/orders', name: 'Orders', templateUrl: 'App/views/orders.html', controller: 'OrderCtrl' }
];

// Configure the routeProvider, which displays a view in the ng-view div in index.html, based on the URI path (e.g. /customers)
app.config(['$routeProvider', function ($routeProvider) {

    var len = app.routes.length;
    for (var i = 0; i < len; i++) {
        var rt = app.routes[i];
        $routeProvider.when(rt.path, rt);
    }
    $routeProvider.otherwise({ redirectTo: '/' });
}]);