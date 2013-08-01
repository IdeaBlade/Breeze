(function () {
    'use strict';
    
    // configure toastr for this app
    toastr.options.timeOut = 2000; // 2 second toast timeout
    toastr.options.positionClass = 'toast-bottom-right';

    // configure Breeze for this app
    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    initBreezeAjaxAdapter(config.userSessionId);
    var app = angular.module('app');
    
    app.factory('config', ['environment', config]);

    function config(environment) {
        return {
            version: '0.5.0',
            server: environment.server,
            serviceName: environment.serviceName,
            devServiceName: environment.devServiceName,
            imageBase: 'app/images/products/',
            userSessionId: breeze.core.getUuid(),
            serverTimeoutMs: 5000 // 5 seconds should be long enough
        };
    }
    
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