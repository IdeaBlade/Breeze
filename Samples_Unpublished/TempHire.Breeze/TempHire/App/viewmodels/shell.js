define(['durandal/system', 'durandal/plugins/router', 'services/logger', 'services/entitymanagerprovider', 'model/modelBuilder'],
    function (system, router, logger, entitymanagerprovider, modelBuilder) {

        entitymanagerprovider.modelBuilder = modelBuilder.extendMetadata;

        var shell = {
            activate: activate,
            router: router
        };
        
        return shell;

        //#region Internal Methods
        function activate() {
            return entitymanagerprovider
                .prepare()
                .then(bootPrivate)
                .fail(function (e) {
                    if (e.status === 401) {
                        return bootPublic();
                    } else {
                        shell.handleError(e);
                        return false;
                    }
                });
        }

        function bootPrivate() {
            router.mapNav('home');
            router.mapNav('resourcemgt', 'viewmodels/resourcemgt', 'Resource Management');
            //router.mapRoute('resourcemgt/:id', 'viewmodels/resourcemgt', 'Resource Management', false);
            log('TempHire Loaded!', null, true);
            return router.activate('home');
        }
        
        function bootPublic() {
            router.mapNav('login');
            return router.activate('login');
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });