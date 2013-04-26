define(['durandal/system', 'durandal/plugins/router', 'services/logger', 'services/entitymanagerprovider', 'services/errorhandler'],
    function (system, router, logger, entitymanagerprovider, errorhandler) {
        var shell = {
            activate: activate,
            router: router
        };
        
        errorhandler.includeIn(shell);

        return shell;

        //#region Internal Methods
        function activate() {
            return entitymanagerprovider
                .prepare()
                .then(boot)
                .fail(function (e) {
                    shell.handleError(e);
                    return false;
                });
        }

        function boot() {
            router.mapNav('home');
            router.mapNav('customers');
            log('Northwind Loaded', null, true);
            return router.activate('home');
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });