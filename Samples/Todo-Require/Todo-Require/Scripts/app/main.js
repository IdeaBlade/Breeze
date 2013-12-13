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
    define(['require', 'ko', 'jquery', 'logger', 'Q'], function (require, ko, $, logger) {

        logger.info('Breeze Todo is booting');

        // require the 'viewModel' shell 
        // require '../text' which is an html-loader require plugin; 
        //     see http://requirejs.org/docs/api.html#text
        require(['viewModel', '../text!view.html'],

        function (viewModel, viewHtml) {
            var $view = $(viewHtml);
            ko.applyBindings(viewModel, $view.get(0));
            $("#applicationHost").append($view);
        });
    });

})();