requirejs.config(
        {
            // well-know paths to selected scripts
            paths: {
                'breeze': 'lib/breeze.debug', // debug version of breeze
                'text': 'lib/text',// html loader plugin; see http://requirejs.org/docs/api.html#text
                'logger': 'services/logger' // used often; easy to forget it is in services folder
            }
        }
    );

define(['logger', 'text', 'breeze'], function(logger) {

    logger.info('Breeze Todo is booting');

    require(['viewmodels/shellVm', 'text!views/shell.html'],
        
        function(shellViewModel, shellHtml) {
            var shellView = jQuery(shellHtml);
            ko.applyBindings(shellViewModel, shellView.get(0));
            jQuery("#applicationHost").append(shellView);
            
    });
});