(function() {
    'use strict';

    var viewBase = 'app/views/';
    
    // Declare all the routes.  
    // Those with a name will be visible in the navigation bar.
    // Those with a :tag are used for sub-navigation within a view.
    var navRoutes = [
        { name: 'Home', path: '/', templateUrl: viewBase+'home.html', controller: 'HomeCtrl' },
        { name: 'Order', path: '/order', templateUrl: viewBase + 'order.html', controller: 'OrderCtrl' },
        { name: 'Menu', path: '/menu', templateUrl: viewBase + 'menu.html' },
        { name: 'About', path: '/about', templateUrl: viewBase + 'about.html' },
        
        { path: '/order/:tag', templateUrl: viewBase + 'order.html', controller: 'OrderCtrl' },
        { path: '/cart', templateUrl: viewBase + 'cart.html', controller: 'CartCtrl' }
    ];
    
    // Routes within the order view
    var orderRoutes = [
        { tag: 'pizza', path: '/order/pizza', name: 'Pizza', templateUrl: viewBase + 'orderpizza.html' },
        { tag: 'salad', path: '/order/salad', name: 'Pasta', templateUrl: viewBase + 'ordersalad.html' },
        { tag: 'drinks', path: '/order/drinks', name: 'Drinks', templateUrl: viewBase + 'orderdrinks.html' },
    ];
    
    var routes = {
        navRoutes: navRoutes,
        orderRoutes: orderRoutes
    };

    angular.module('app')
        .value('routes', routes)
        .config(['$routeProvider', function ($routeProvider) {
            navRoutes.forEach(function(route) {
                $routeProvider.when(route.path, route);
            });
        $routeProvider.otherwise({ redirectTo: '/' });
    }]);
    

})();