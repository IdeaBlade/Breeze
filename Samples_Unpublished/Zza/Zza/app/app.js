'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('Zza', []);

// Declare all the routes.  Those with a name will be visible in the navigation bar.
// Those with a :tag are used for sub-navigation within a view.
app.routes = [
    { path: '/', name: 'Home', templateUrl: 'App/views/home.html', controller: 'HomeCtrl' },
    { path: '/order', name: 'Order', templateUrl: 'App/views/order.html', controller: 'OrderCtrl' },
    { path: '/order/:tag', templateUrl: 'App/views/order.html', controller: 'OrderCtrl' },
    { path: '/menu', name: 'Menu', templateUrl: 'App/views/menu.html' },
    { path: '/about', name: 'About', templateUrl: 'App/views/about.html' },
    { path: '/cart', templateUrl: 'App/views/cart.html', controller: 'CartCtrl' }
];

// Routes within the order view
app.orderroutes = [
    { tag: 'pizza', path: '/order/pizza', name: 'Pizza', templateUrl: 'App/views/orderpizza.html' },
    { tag: 'pasta', path: '/order/pasta', name: 'Pasta', templateUrl: 'App/views/orderpasta.html' },
    { tag: 'drinks', path: '/order/drinks', name: 'Drinks', templateUrl: 'App/views/orderdrinks.html' },
];


app.config(['$routeProvider', function ($routeProvider) {

    var len = app.routes.length;
    for (var i = 0; i < len; i++) {
        var rt = app.routes[i];
        $routeProvider.when(rt.path, rt);
    }
    $routeProvider.otherwise({ redirectTo: '/' });
}]);