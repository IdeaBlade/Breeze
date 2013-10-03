define(['durandal/system', 'plugins/router', 'services/logger', 'services/entitymanagerprovider', 'model/modelBuilder', 'services/errorhandler'],
    function (system, router, logger, entitymanagerprovider, modelBuilder, errorhandler) {

        entitymanagerprovider.modelBuilder = modelBuilder.extendMetadata;

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
            log('TempHire Loaded!', null, true);

            return router
                .makeRelative({ moduleId: 'viewmodels' })
                .map([
                    { route: '', moduleId: 'home', title: 'Home', nav: true },
                    //{ route: 'home', moduleId: 'home', title: 'Home', nav: true },
                    { route: 'resourcemgt', moduleId: 'resourcemgt', title: 'Resource Management', nav: true }])
                .mapUnknownRoutes('home', 'not-found')
                .buildNavigationModel()
                .activate();
        }
        
        function bootPublic() {
            return router
                .makeRelative({ moduleId: 'viewmodels' })
                .map([
                    { route: '', moduleId: 'login', nav: true }])
                .mapUnknownRoutes('login', 'not-found')
                .activate();
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });