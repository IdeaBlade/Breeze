define(['durandal/system', 'durandal/plugins/router', 'services/datacontext', 'config', 'services/logger'],
    function (system, router, datacontext, config, logger) {
 	
        var adminRoutes = ko.computed(function () {
            return router.allRoutes().filter(function (r) {
                return r.settings.admin;
            });
        });
        
        var shell = {
            activate: activate,
            appSubtitle: config.appSubtitle,
            addSession: addSession,
            adminRoutes: adminRoutes,
            debugEnabled: config.debugEnabled,
            clearStorage: clearStorage,
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
            log('Ruby CodeCamper Jumpstart loaded!', null, true);
            return router.activate(config.startModule);
        }
        
        function addSession(item) {
            router.navigateTo(item.hash);
        }

        function clearStorage() {
            datacontext.clearStorage();
        }

        function failedInitialization(error) {
            var msg = 'App initialization failed: ' + error.message;
            logger.logError(msg, error, system.getModuleId(shell), true);
        }

        function toggleDebugMessages() {
            config.debugEnabled(!config.debugEnabled());
            system.debug(config.debugEnabled());
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });