(function() {
    'use strict';

    var viewBase = 'app/views/';
    
    // Declare all the routes.  
    // Those with a name will be visible in the navigation bar.
    // Those with a :tag are used for sub-navigation within a view.
    var navRoutes = [
        { name: 'Home', path: '/', templateUrl: viewBase + 'home.html' },//, controller: 'homeCtrl' },
        { name: 'Order', path: '/order', templateUrl: viewBase + 'order.html', controller: 'orderCtrl' },
        { path: '/order/:tag', templateUrl: viewBase + 'order.html', controller: 'orderCtrl' },
        { path: '/order/:tag/:id', templateUrl: viewBase + 'order.html', controller: 'orderCtrl' },
        { name: 'Menu', path: '/menu', templateUrl: viewBase + 'menu.html' },
        { name: 'About', path: '/about', templateUrl: viewBase + 'about.html' },
        
        { path: '/test/', templateUrl: viewBase + 'test.html', controller: 'testCtrl' },
        { path: '/test/:id', templateUrl: viewBase + 'test.html', controller: 'testCtrl' },
        { path: '/cart', templateUrl: viewBase + 'cart.html', controller: 'cartCtrl' }

    ];
    
    // Routes within the order view
    var orderRoutes = [
        { tag: 'pizza', path: '/order/pizza', name: 'Pizza', templateUrl: viewBase + 'orderpizza.html' },
        { tag: 'salad', path: '/order/salad', name: 'Salad', templateUrl: viewBase + 'ordersalad.html' },
        { tag: 'drinks', path: '/order/drinks', name: 'Drinks', templateUrl: viewBase + 'orderdrinks.html' },
        { tag: 'pizzadetail', path: '/order/pizzadetail', templateUrl: viewBase + 'orderpizzadetail.html' },
        { tag: 'pizzadetail', path: '/order/pizzadetail', templateUrl: viewBase + 'orderpizzadetail.html' }
    ];
    
    var routes = {
        navRoutes: navRoutes,
        orderRoutes: orderRoutes,
        // visible routes are those that have a display name
        visibleNavRoutes: navRoutes.filter(function (item) { return item.name; }),
        visibleOrderRoutes: orderRoutes.filter(function (item) { return item.name; })
    };

    var app = angular.module('app')
        .value('routes', routes)
        .config(['$routeProvider', function ($routeProvider) {
            navRoutes.forEach(function (route) {
                var resolve = app.routeResolve[route.controller];
                if (resolve) { route.resolve = resolve; }
                $routeProvider.when(route.path, route);
            });
        $routeProvider.otherwise({ redirectTo: '/' });
    }]);
    

})();