(function() {
    'use strict';

    var viewBase = 'app/views/';
    
    // Declare all the routes.  
    // Those with a name will be visible in the navigation bar.
    // Those with a token (e.g., :tag) are used for sub-navigation within a view.
    var navRoutes = [
        { name: 'Home', path: '/', templateUrl: viewBase + 'home.html' },//, controller: 'homeController' },

        { name: 'Order', path: '/order', templateUrl: viewBase + 'order.html', controller: 'orderProductController' },
        { path: '/order/:product', templateUrl: viewBase + 'order.html', controller: 'orderProductController' },
        { path: '/order/:product/:id', templateUrl: viewBase + 'order.html', controller: 'orderItemController' },
        { path: '/order/:orderId/item/:id', templateUrl: viewBase + 'order.html', controller: 'orderItemController' },

        { name: 'About', path: '/about', templateUrl: viewBase + 'about.html' },
        
        { path: '/cart', templateUrl: viewBase + 'cart.html', controller: 'cartController' },
        
        { path: '/test/', templateUrl: viewBase + 'test.html', controller: 'testController' },
        { path: '/test/:id', templateUrl: viewBase + 'test.html', controller: 'testController' }
    ];
    
    // Routes within the order view that lead to product list views
    var orderProductRoutes = [
        { tag: 'pizza', path: '/order/pizza', name: 'Pizza', templateUrl: viewBase + 'orderProductPizza.html' },
        { tag: 'salad', path: '/order/salad', name: 'Salad', templateUrl: viewBase + 'orderProductSalad.html' },
        { tag: 'drink', path: '/order/drink', name: 'Drinks', templateUrl: viewBase + 'orderProductDrinks.html' }
    ];
    
    var routes = {
        navRoutes: navRoutes,
        orderProductRoutes: orderProductRoutes,
        // visible routes are those that have a (display) name
        visibleNavRoutes: navRoutes.filter(function (item) { return item.name; }),
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