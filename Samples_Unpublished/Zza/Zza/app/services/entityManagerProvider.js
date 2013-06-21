(function () {
    'use strict';
    angular.module('app').factory(
        'entityManagerProvider', ['config', 'model', emProvider]);

    function emProvider(config, model) {
        var manager = new breeze.EntityManager(config.serviceName);
        manager.enableSaveQueuing(true);
        model.configureMetadataStore(manager.metadataStore);
        return {manager: manager};
   }

})();