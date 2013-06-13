(function() {
    'use strict';
    
    angular.module('app').filter('interpolate',
    ['config', function (config) {
        return function(text) {
            return String(text).replace(/\%VERSION\%/mg, config.version);
        };
    }]);
    
})();