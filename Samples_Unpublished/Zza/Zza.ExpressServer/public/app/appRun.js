(function() {
    'use strict';
    
    angular.module('app').run(['dataservice', 'logger',
        function (dataservice, logger) {
            // initialize dataservice on launch, even if don't need data yet
            //dataservice.initialize();
            logger.log("app module is loaded but EXPRESS not calling dataservice.initialize.");
    }]);

})();