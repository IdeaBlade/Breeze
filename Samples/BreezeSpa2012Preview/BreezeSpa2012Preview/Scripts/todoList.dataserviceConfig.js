// ReSharper disable InconsistentNaming
window.TodoApp = window.TodoApp || {};

window.TodoApp.dataserviceConfig = (function(breeze) {

    // define Breeze namespaces
    var core = breeze.core,
        entityModel = breeze.entityModel;

    // configure Breeze for Knockout and Web API 
    core.config.setProperties({
        trackingImplementation: entityModel.entityTracking_ko,
        remoteAccessImplementation: entityModel.remoteAccess_webApi
    });

    // service name is route to the Breeze Todo Web API controller
    var serviceName = 'api/BreezeTodo';
    var saveOptions = new entityModel.SaveOptions({ allowConcurrentSaves: true });

    // factory for manager; manager is the service gateway and cache holder
    createManager = function() {
        return new entityModel.EntityManager({
            serviceName: serviceName,
            saveOptions: saveOptions
        });
    };

    return {
        createManager: createManager
    };
    
})(breeze);