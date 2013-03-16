define(['durandal/system', 'durandal/plugins/router', 'services/logger', 'services/entitymanagerprovider'],
    function (system, router, logger, entitymanagerprovider) {
        var shell = {
            activate: activate,
            router: router
        };
        
        return shell;

        //#region Internal Methods
        function activate() {
            return entitymanagerprovider.prepare().then(boot);
        }

        function boot() {
            router.mapNav('home');
            router.mapNav('resourcemgt', 'viewmodels/resourcemgt', 'Resource Management');
            //router.mapRoute('resourcemgt/:id', 'viewmodels/resourcemgt', 'Resource Management', false);
            log('TempHire Loaded!', null, true);
            return router.activate('home');
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });