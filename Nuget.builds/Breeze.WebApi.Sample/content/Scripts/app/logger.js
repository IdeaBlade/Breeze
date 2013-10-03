(function (exports) {
    var app = exports.app = exports.app || {};
    var logCounter = 1;
    var logger = {
        error: error,
        validationError: validationError,
        info: info,
        success: success,
        warning: warning
    };

    function error(message) {
        log("log-error", message);
    };
    function validationError(message) {
        log("log-validation-error",message);
    };
    function info(message) {
        log("log-info", message);
    };
    function success(message) {
        log("log-success", message);
    };
    function warning(message) {
        log("log-warning", message);
    };


    function log(cssClass, message) {
        var logmessage = "<div class='" + cssClass + "'>" +
            logCounter++ + ": " + message + "</div>";
        $("#logmessages").append(logmessage);
    }

    app.logger = logger;

}(window));