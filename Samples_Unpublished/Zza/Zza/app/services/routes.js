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
    
    // Routes within the order view that lead to list views
    var orderRoutes = [
        { tag: 'pizza', path: '/order/pizza', name: 'Pizza', templateUrl: viewBase + 'orderpizza.html' },
        { tag: 'salad', path: '/order/salad', name: 'Salad', templateUrl: viewBase + 'ordersalad.html' },
        { tag: 'beverage', path: '/order/beverage', name: 'Drinks', templateUrl: viewBase + 'orderdrinks.html' }
    ];

    // Routes within the order view that lead to detail views.  These expect an :id parameter.
    var detailRoutes = [
        { tag: 'pizza', path: '/order/pizza', templateUrl: viewBase + 'productdetail.html' },
        { tag: 'salad', path: '/order/salad', templateUrl: viewBase + 'productdetail.html' },
        { tag: 'beverage', path: '/order/beverage', templateUrl: viewBase + 'productdetail.html' },
        { tag: 'item', path: '/order/item', templateUrl: viewBase + 'productdetail.html' }
    ];
    
    var routes = {
        navRoutes: navRoutes,
        orderRoutes: orderRoutes,
        detailRoutes: detailRoutes,
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