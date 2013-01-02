requirejs.config(
        {
            // well-know paths to selected scripts
            paths: {
                'breeze': '../breeze.debug', // debug version of breeze
                'text': '../text',// html loader plugin; see http://requirejs.org/docs/api.html#text
            }
        }
    );

define(['logger', 'text', 'breeze'], function(logger) {

    logger.info('Breeze Todo is booting');

    require(['viewModel', 'text!view.html'],
        
        function(viewModel, viewHtml) {
            var $view = jQuery(viewHtml);
            ko.applyBindings(viewModel, $view.get(0));
            jQuery("#applicationHost").append($view);
            
    });
});