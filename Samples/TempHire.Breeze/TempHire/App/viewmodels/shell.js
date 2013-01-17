define(['durandal/system', 'durandal/plugins/router', 'logger', 'services/entitymanagerprovider'],
    function (system, router, logger, entitymanagerprovider) {
 	
        var adminRoutes = ko.computed(function () {
            return router.allRoutes().filter(function (r) {
                return r.settings.admin;
            });
        });

        var shell = {
            activate: activate,
            adminRoutes: adminRoutes,
            navigate: navigate,
            router: router
        };
        
        return shell;

        //#region Internal Methods
        function activate() {
            return entitymanagerprovider.prepare().then(boot);
        }

        function boot() {
            // TODO: map routes here
            var routes = [
                { url: 'home', moduleId: 'viewmodels/home', name: 'Home', visible: true },
                { url: 'resourcemgt', moduleId: 'viewmodels/resourcemgt', name: 'Resource Management', visible: true },
                { url: 'resourcemgt/:id', moduleId: 'viewmodels/resourcemgt', name: 'Resource Management Detail', visible: false }
            ];
            router.map(routes);
            log('TempHire Loaded!', null, true);
            //TODO: set your default startup route here
            return router.activate('home');
        }

        function navigate(item) {
            router.navigateTo(item.hash);
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });