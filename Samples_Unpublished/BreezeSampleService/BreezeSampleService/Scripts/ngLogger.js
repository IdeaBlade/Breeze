/* Logger for Angular demos 
 * Load script after creating module with name 'app'
 */
app.factory('logger', function () {
    var logger = {
        logList: [],
        lastLog: "",
        log: log
    };
    return logger;

    function log(text) {
        logger.lastLog = text;
        logger.logList.push(text);
        if (console && console.log) { console.log(text); }
        //    Vanilla JS version
        //    var logEl = document.getElementById('log');
        //    if (logEl) {
        //       logEl.innerHTML += '<li>' + text + '</li>';
        //    }
    }
});