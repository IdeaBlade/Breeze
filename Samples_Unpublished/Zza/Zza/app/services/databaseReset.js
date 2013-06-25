(function () {
    'use strict';
    angular.module('app').factory(
        'databaseReset', ['$http', 'config', dbReset]);
    
    // TODO: use $http instead of jQuery.ajax ($.post)
    function dbReset($http, config) {
        
        return { reset: reset };

        function reset() {

            var deferred = $q.defer();

            //See http://docs.angularjs.org/api/ng.$http
            $http.post(config.devServiceName + '/reset')
                .success(success).error(fail);

            function success(data) {
                deferred.resolve("Database reset succeeded with message: " + data);
            }

            function fail(data, status) {
                deferred.reject(getMessage);

                function getMessage() {
                    var message = "Database reset failed (" + status + ")";
                    if (data) {
                        try {
                            data = JSON.parse(data).Message;
                        } finally {
                            message += "\n" + data;
                        }                      
                    }
                    return message;
                }
            }
        }
    }
})();