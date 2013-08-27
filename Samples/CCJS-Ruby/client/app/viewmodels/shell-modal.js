define(['durandal/system', 'durandal/app', 'durandal/plugins/router', 'services/datacontext', 'config', 'viewmodels/sessionadd'],
    function (system, app, router, datacontext, config, sessionadd) {
        var shell = {
            activate: activate,
            appSubtitle: config.appTitle,
            addSession: function () {
                //app.showModal(new sessionadd()).then(function (result) {
                app.showModal(sessionadd).then(function (result) {
                    //sessionAddVm.show().then(function (result) {
                    //handle result here if you care...
                    if (result.action) {
                        result.action();
                    }
                    //toastr.info(result);
                });
            },
            debugEnabled: config.debugEnabled,
            clearStorage: clearStorage,
            navigate: navigate,
            router: router,
            toggleDebugMessages: toggleDebugMessages
        };

        return shell;

        //#region Internal Methods
        function activate() {
            return datacontext.primeData()
                .then(boot)
                .fail(failedInitialization);
        }

        function boot() {
            router.map(config.routes);
            toastr.options.timeOut = config.toastrOptions.timeOut;
            toastr.info('Ruby CodeCamper Jumpstart successfully loaded!');
            return router.activate(config.startModule);
        }

        function navigate(item) {
            router.navigateTo(item.hash);
        }

        function clearStorage() {
            datacontext.clearStorage();
        }

        function failedInitialization(error) {
            toastr.error('App initialization failed: ' + error.message);
        }

        function toggleDebugMessages() {
            config.debugEnabled(!config.debugEnabled());
            system.debug(config.debugEnabled());
        }
        //#endregion
    });