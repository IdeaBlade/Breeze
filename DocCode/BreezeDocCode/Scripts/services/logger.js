define(function () {

    // This logger wraps the toastr logger and also logs to console
    // toastr.js is library by John Papa that shows messages in pop up toast.
    // https://github.com/CodeSeven/toastr

    toastr.options.timeOut = 2000; // 2 second toast timeout
    toastr.options.positionClass = 'toast-bottom-right';

            
    // Circumvent IE "console undefined" 
    if (!window.console) 
        console = { log: function () { } }; 

    function error(message, title) {
        toastr.error(message, title);
        console.log("Error: " + message);
    };
    function info(message, title) {
        toastr.info(message, title);
        console.log("Info: " + message);
    };
    function success(message, title) {
        toastr.success(message, title);
        console.log("Success: " + message);
    };
    function warning(message, title) {
        toastr.warning(message, title);
        console.log("Warning: " + message);
    };
    var logger = {
        error: error,
        info: info,
        success: success,
        warning: warning,
        log: console.log // straight to console; bypass toast
    };

    return logger;
});