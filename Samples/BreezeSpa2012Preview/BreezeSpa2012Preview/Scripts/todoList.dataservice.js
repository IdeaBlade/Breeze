(function (root, breeze) {
    root.TodoApp = root.TodoApp || {};

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

    // manager is the service gateway and cache holder
    var manager = new entityModel.EntityManager(serviceName);
    var metadataStore = manager.metadataStore;

    var
        getTodoLists = function (todoListsObservable, errorObservable) {
            return entityModel.EntityQuery
                .from("TodoLists")// .expand("Todos") want to expand but am blocked for now
                .using(manager).execute()
                .then(querySucceeded)
                .fail(queryFailed);

            function querySucceeded(data) {
                todoListsObservable(data.results);
            }

            function queryFailed(error) {
                errorObservable("Error retrieving todo lists: " + error.message);
            }
        },
        createTodoItem = function () {
            return metadataStore.getEntityType("TodoItem").createEntity();
        },
        createTodoList = function () {
            return metadataStore.getEntityType("TodoList").createEntity();
        },
        addEntity = function (entity) {
            return saveEntity(manager.addEntity(entity));
        },
        deleteEntity = function (entity) {
            entity.entityAspect.setDeleted();
            return saveEntity(entity)
        },
        cancelChanges = function (entity) {
            entity.entityAspect.rejectChanges();
        },
        saveEntity = function (entity) {
            entity.ErrorMessage(null);
            return manager.saveChanges([entity])
                .then(saveSucceeded)
                .fail(saveFailed);

            function saveSucceeded(saveResult) {
                return entity;
            }

            function saveFailed(error) {
                var stateName = entity.entityAspect.entityState.name.toLowerCase();
                var message = "Error saving " + stateName + entity.entityType.shortName
                // set ErrorMessage if entity has one
                if (entity.ErrorMessage) { entity.ErrorMessage(message); }
                cancelChanges(entity); // undo changes on fail
                return entity;
            }
        };

    root.TodoApp.dataservice = {
        metadataStore: metadataStore,
        getTodoLists: getTodoLists,
        createTodoList: createTodoList,
        createTodoItem: createTodoItem,
        addEntity: addEntity,
        deleteEntity: deleteEntity,
        cancelChanges: cancelChanges,
        saveEntity: saveEntity
    };

})(window, breeze);