window.TodoApp = window.TodoApp || {};

window.TodoApp.breezedatacontextConfig = (function(breeze) {
    
    var entityModel = breeze.entityModel; // main Breeze namespace

    // service name is route to the Web API controller
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