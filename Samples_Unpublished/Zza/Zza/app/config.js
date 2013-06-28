(function () {
    'use strict';

    var app = angular.module('app');
    
    var config = {
        version: '0.1',
        serviceName: 'breeze/ZzaEf',
        devServiceName: 'breeze/Dev',
        imageBase: 'app/images/products/',
        userSessionId: breeze.core.getUuid()
    };       
    app.value('config', config); 

    toastr.options.timeOut = 2000; // 2 second toast timeout
    toastr.options.positionClass = 'toast-bottom-right';
    app.value('toastr', toastr);
    
    // configure Breeze for this app
    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    breeze.NamingConvention.camelCase.setAsDefault();
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