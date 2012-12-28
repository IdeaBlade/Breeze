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

    require(['shellViewModel', 'text!shell.html'],
        
        function(shellViewModel, shellHtml) {
            var shellView = jQuery(shellHtml);
            ko.applyBindings(shellViewModel, shellView.get(0));
            jQuery("#applicationHost").append(shellView);
            
    });
});