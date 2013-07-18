(function () {
    'use strict';

    var app = angular.module('app');
    
    app.factory('config', ['environment', config]);

    function config(environment) {
        return {
            version: '0.1',
            server: environment.server,
            serviceName: environment.serviceName,
            devServiceName: environment.devServiceName,
            imageBase: 'app/images/products/',
            userSessionId: breeze.core.getUuid()
        };
    }


    toastr.options.timeOut = 2000; // 2 second toast timeout
    toastr.options.positionClass = 'toast-bottom-right';
    app.value('toastr', toastr);
    
    // configure Breeze for this app
    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    initBreezeAjaxAdapter(config.userSessionId);
    app.value('breeze', breeze);
    
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