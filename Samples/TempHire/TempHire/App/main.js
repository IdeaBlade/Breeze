require.config({
    baseUrl: '/App',
    paths: {
        'text': '../Scripts/text',
        'durandal': '../Scripts/durandal',
        'plugins': '../Scripts/durandal/plugins',
        'transitions': '../Scripts/durandal/transitions'
    }
});

define('jquery', function () { return jQuery; });
define('knockout', ko);

define(['durandal/app', 'durandal/viewLocator', 'durandal/system', 'plugins/router', 'services/logger'],
    function(app, viewLocator, system, router, logger) {

        // Enable debug message to show in the console 
        system.debug(true);

        app.title = 'TempHire';
        
        // Specify which plugins to install und their configuation
        app.configurePlugins({
            router: true,
            dialog: true
        });

        app.start().then(function() {

            // Q shim
            system.defer = function(action) {
                var deferred = Q.defer();
                action.call(deferred, deferred);
                var promise = deferred.promise;
                deferred.promise = function() {
                    return promise;
                };

                return deferred;
            };

            toastr.options.positionClass = 'toast-bottom-right';
            toastr.options.backgroundpositionClass = 'toast-bottom-right';

            //router.handleInvalidRoute = function(route, params) {
            //    logger.logError('No Route Found', route, 'main', true);
            //};

            // When finding a viewmodel module, replace the viewmodel string 
            // with view to find it partner view.
            viewLocator.useConvention();

            //Show the app by setting the root view model for our application.
            app.setRoot('viewmodels/shell', 'entrance');
        });
    });