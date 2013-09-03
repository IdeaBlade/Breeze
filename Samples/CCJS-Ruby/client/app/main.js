require.config({
    paths: {
        "text": "durandal/amd/text"
    }
});

define(function (require) {
    var app = require('durandal/app'),
        viewLocator = require('durandal/viewLocator'),
        system = require('durandal/system'),
        router = require('durandal/plugins/router'),
        config = require('config'),
        logger = require('services/logger');

    system.debug(config.debugEnabled());

    app.start().then(function () {
        app.adaptToDevice();

        // route will use conventions for modules
        // assuming viewmodels/views folder structure
        router.useConvention();

        // When finding a viewmodel module, replace the viewmodel string 
        // with view to find it partner view.
        // [viewmodel]s/sessions --> [view]s/sessions.html
        // Defaults to viewmodels/views/views. 
        // Otherwise you can pass paths for modules, views, partials
        viewLocator.useConvention();

        //Show the app by setting the root view model for our application.
        // root, transition, application host ID
        app.setRoot('viewmodels/shell', 'entrance');

        // override bad route behavior to write to 
        // console log and show error toast
        router.handleInvalidRoute = function (route, params) {
            logger.logError('No Route Found', route, 'main', true);
        };
    });
});