(function () {
    'use strict';

    var config = {
        version: '0.1',
        serviceName: 'breeze/ZzaEf',
        imageBase: 'app/images/products/',
        userSessionId: breeze.core.getUuid()
    };
        
    angular.module('app').value('config', config);

    // configure Breeze for this app
    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    breeze.NamingConvention.camelCase.setAsDefault();
    initBreezeAjaxAdapter(config.userSessionId);

    function initBreezeAjaxAdapter(userSessionId) {
        // get the current default Breeze AJAX adapter
        var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
        ajaxAdapter.defaultSettings = {
            headers: {
                "X-UserSessionId": userSessionId
            }
        };
    }
    
})();