(function (root) {
    var app = root.app = root.app || {};
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
    
    //app.logger.success("went great");
    //app.logger.info("know this");
    //app.logger.warning("watchout!");
    //app.logger.validationError("incorrect value");
    //app.logger.error("you blew it");
    
}(window));