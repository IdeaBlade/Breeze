(function() {
    'use strict';

    var viewBase = 'app/views/';
    
    // Declare all the routes.  
    // Those with a name will be visible in the navigation bar.
    // Those with a :tag are used for sub-navigation within a view.
    var navRoutes = [
        { name: 'Home', path: '/', templateUrl: viewBase + 'home.html' },//, controller: 'homeController' },
        { name: 'Order', path: '/order', templateUrl: viewBase + 'order.html', controller: 'orderController' },
        { path: '/order/:tag', templateUrl: viewBase + 'order.html', controller: 'orderController' },
        { path: '/order/:tag/:id', templateUrl: viewBase + 'order.html', controller: 'orderController' },
        { name: 'About', path: '/about', templateUrl: viewBase + 'about.html' },
        
        { path: '/test/', templateUrl: viewBase + 'test.html', controller: 'testController' },
        { path: '/test/:id', templateUrl: viewBase + 'test.html', controller: 'testController' },
        { path: '/cart', templateUrl: viewBase + 'cart.html', controller: 'cartController' }

    ];
    
    // Routes within the order view that lead to list views
    var orderRoutes = [
        { tag: 'pizza', path: '/order/pizza', name: 'Pizza', templateUrl: viewBase + 'orderpizza.html' },
        { tag: 'salad', path: '/order/salad', name: 'Salad', templateUrl: viewBase + 'ordersalad.html' },
        { tag: 'beverage', path: '/order/beverage', name: 'Drinks', templateUrl: viewBase + 'orderdrinks.html' }
    ];

    // Routes within the order view that lead to productOrder views.  These expect an :id parameter.
    var productOrderRoutes = [
        { tag: 'pizza', path: '/order/pizza', templateUrl: viewBase + 'productOrder.html' },
        { tag: 'salad', path: '/order/salad', templateUrl: viewBase + 'productOrder.html' },
        { tag: 'beverage', path: '/order/beverage', templateUrl: viewBase + 'productOrder.html' },
        { tag: 'item', path: '/order/item', templateUrl: viewBase + 'productOrder.html' }
    ];
    
    var routes = {
        navRoutes: navRoutes,
        orderRoutes: orderRoutes,
        productOrderRoutes: productOrderRoutes,
        // visible routes are those that have a display name
        visibleNavRoutes: navRoutes.filter(function (item) { return item.name; }),
        visibleOrderRoutes: orderRoutes.filter(function (item) { return item.name; })
    };

    var app = angular.module('app')
        .value('routes', routes)
        .config(['$routeProvider', function ($routeProvider) {
            navRoutes.forEach(function (route) {
                setRouteResolve(route);
                $routeProvider.when(route.path, route);
            });
        $routeProvider.otherwise({ redirectTo: '/' });
    }]);
    
    function setRouteResolve(route) {
        var controllerName = route.controller;
        var resolve = app.routeResolve[controllerName];
        if (resolve) {
            setDataServiceInit();
            route.resolve = resolve;
        }

        function setDataServiceInit() {
            if (!resolve.dataServiceInit) return;
            // replace `true` with the dataServiceInit function.
            var init = function(dataservice, logger) {
                logger.log(controllerName + " is waiting for dataservice init");
                return dataservice.initialize();
            };
            init.$inject = ['dataservice', 'logger'];
            resolve.dataServiceInit = init;
        }
    }

})();