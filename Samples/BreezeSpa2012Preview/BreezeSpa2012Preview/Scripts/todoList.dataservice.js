// ReSharper disable InconsistentNaming
(function (root, breeze) {
    
    /*** CONFIGURATION ***/
    
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
    var saveOptions = new entityModel.SaveOptions({ allowConcurrentSaves: true });

    // manager is the service gateway and cache holder
    var manager = new entityModel.EntityManager({
        serviceName: serviceName,
        saveOptions: saveOptions
    });
    
    var metadataStore = manager.metadataStore;
    
    /*** DATASERVICE ***/

    var
        getTodoLists = function (todoListsObservable, errorObservable) {
            return entityModel.EntityQuery
                .from("TodoLists").expand("Todos") 
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
        deleteTodoItem = function (todoItem) {
            todoItem.entityAspect.setDeleted();
            return saveEntity(todoItem);
        },
        deleteTodoList = function (todoList) {
            dataservice.suspendSave = true;
            todoList.entityAspect.setDeleted();// ripple effects 
            dataservice.suspendSave = false;
            return saveEntity(todoList);
        },
        saveEntity = function (entity) {
            entity.ErrorMessage(null);
            return manager.saveChanges([entity]) 
                .then(saveSucceeded)
                .fail(saveFailed);

            function saveSucceeded(saveResult) { return entity; }

            function saveFailed(error) {
                var emsg = getSaveErrorMessage();
                if (entity.ErrorMessage) { entity.ErrorMessage(emsg); }
                cancelAllChanges(); // undo all changes on fail
                throw error; // for benefit of caller
                var err = new Error(emsg);
                err.entity = entity;
                throw err;// for benefit of caller 
            }
            
            function getSaveErrorMessage() {
                if (!entity) { return "Error while saving."; }
                var statename = entity.entityAspect.entityState.name.toLocaleLowerCase();
                return "Error saving " + statename + " " + entity.entityType.shortName;
            }
        },
        cancelAllChanges = function () {
            dataservice.suspendSave = true;
            manager.rejectChanges();
            dataservice.suspendSave = false;
        },
        dataservice = {
            metadataStore: metadataStore,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodoItem: createTodoItem,
            addEntity: addEntity,
            deleteTodoItem: deleteTodoItem,
            deleteTodoList: deleteTodoList,
            saveEntity: saveEntity,
            suspendSave: false
        };
    
    root.TodoApp.dataservice = dataservice;
})(window, breeze);