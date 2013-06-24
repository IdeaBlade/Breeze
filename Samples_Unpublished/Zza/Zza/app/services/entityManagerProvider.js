(function () {
    'use strict';
    angular.module('app').factory(
        'entityManagerProvider', ['config', 'model', emProvider]);

    function emProvider(config, model) {
        // todo: make async?
        var serviceName = config.serviceName;

        var metadataStore = getMetadataStore();
        
        var masterManager = new breeze.EntityManager({
            serviceName: serviceName,
            metadataStore: metadataStore
        });
        
        masterManager.enableSaveQueuing(true);
        
        return {
            masterManager: masterManager, // mostly for testing
            manager: createNewManager()
        };
        
        // Todo: relocate to service? Async?
        function getMetadataStore() {
            var store = new breeze.MetadataStore();

            // Import metadata that were downloaded as a script file
            store.importMetadata(zza.metadata);

            // Associate these metadata data with the service
            store.addDataService(
                new breeze.DataService({ serviceName: serviceName }));           

            model.configureMetadataStore(store);

            return store;
        }
        
        function createNewManager() {
            var mgr = masterManager.createEmptyCopy();
            mgr.enableSaveQueuing(true);
            return mgr;
        }
   }

})();