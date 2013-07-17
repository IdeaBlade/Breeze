(function() {
    'use strict';
    
    angular.module('app').run(['dataservice', 'util',
        function (dataservice, util) {
            // initialize dataservice on launch, even if don't need data yet
            dataservice.initialize(); 
            util.logger.log("app module is loaded and running on " + util.config.server);
    }]);

})();