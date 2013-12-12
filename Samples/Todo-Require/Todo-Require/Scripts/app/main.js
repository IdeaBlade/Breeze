(function () {

    requirejs.config({
        paths: {
            'breeze': '../breeze.debug',
            'breeze.savequeuing': '../breeze.savequeuing',
            'jquery': '../jquery-1.8.3.min',
            'ko': '../knockout-2.2.0',
            'Q': '../q'
        }
    });

    //  Launch the app
    //  Start by requiring the 3rd party libraries that Breeze should find
    define(['require', 'ko', 'jquery', 'Q'], function (require, ko, $) {

        // Load the logger and breeze next ...
        require(['logger', 'breeze'], function (logger) {

            logger.info('Breeze Todo is booting');

            // '../text' is an html-loader require plugin; 
            // see http://requirejs.org/docs/api.html#text
            require(['viewModel', '../text!view.html', 'breeze.savequeuing'],

                function (viewModel, viewHtml) {
                    var $view = $(viewHtml);
                    ko.applyBindings(viewModel, $view.get(0));
                    $("#applicationHost").append($view);
                });
        });
    });

    
})();