(function () {
    'use strict';
    angular
        .module('app').factory(
            'logger', ['$log', function ($log) {

        // This logger wraps the toastr logger and also logs to console
        // toastr.js is library by John Papa that shows messages in pop up toast.
        // https://github.com/CodeSeven/toastr

        var logger = {
            error: error,
            info: info,
            success: success,
            warning: warning,
            log: $log.log // straight to console; bypass toast
        };

        return logger;
        
        //#region implementation
        function error(message, title) {
            toastr.error(message, title);
            $log.error("Error: " + message);
        }

        function info(message, title) {
            toastr.info(message, title);
            $log.info("Info: " + message);
        }

        function success(message, title) {
            toastr.success(message, title);
            $log.info("Success: " + message);
        }

        function warning(message, title) {
            toastr.warning(message, title);
            $log.warn("Warning: " + message);
        }

        //#endregion
    }]);
})();