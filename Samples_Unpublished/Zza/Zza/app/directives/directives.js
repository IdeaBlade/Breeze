(function () {
    'use strict';
    angular.module('app')
        .directive('appVersion', ['config', function(config) {
            return function(scope, elm) {
                elm.text(config.version);
            };
        }]);

})();