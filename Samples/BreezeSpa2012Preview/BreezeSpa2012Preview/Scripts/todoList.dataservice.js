window.TodoApp.dataservice = (function (breeze, config) {

    var entityModel = breeze.entityModel, // namespace
        manager = config.createManager(),
        metadataStore = manager.metadataStore,
        getTodoLists = function(todoListsObservable, errorObservable) {
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
        createTodoItem = function() {
            return metadataStore.getEntityType("TodoItem").createEntity();
        },
        createTodoList = function() {
            return metadataStore.getEntityType("TodoList").createEntity();
        },
        addAndSaveEntity = function(entity) {
            return saveEntity(manager.addEntity(entity));
        },
        deleteAndSaveTodoItem = function(todoItem) {
            todoItem.entityAspect.setDeleted();
            return saveEntity(todoItem);
        },
        deleteAndSaveTodoList = function(todoList) {
            var todoItems = todoList.Todos();
            dataservice.suspendSave = true;
            todoList.entityAspect.setDeleted(); // ripple effects 
            dataservice.suspendSave = false;
            return saveEntity(todoList).then(deleteSucceeded);

            function deleteSucceeded() {
                purge(todoItems); // remove dead TodoItems from cache
            }
        },
        saveEntity = function(entity) {
            entity.ErrorMessage(null);
            return manager.saveChanges([entity])
                .then(saveSucceeded)
                .fail(saveFailed);

            function saveSucceeded() { return entity; }

            function saveFailed(error) {
                var emsg = getSaveErrorMessage();
                if (entity.ErrorMessage) {
                    entity.ErrorMessage(emsg);
                }
                cancelAllChanges(); // undo all changes on fail
                throw error; // for benefit of caller
            }

            function getSaveErrorMessage() {
                if (!entity) {
                    return "Error while saving.";
                }
                var statename = entity.entityAspect.entityState.name.toLocaleLowerCase();
                return "Error saving " + statename + " " + entity.entityType.shortName;
            }
        },
        cancelAllChanges = function() {
            dataservice.suspendSave = true;
            manager.rejectChanges();
            dataservice.suspendSave = false;
        },
        purge = function(entities) { // remove entities from cache
            entities.forEach(function(entity) { manager.detach(entity); });
        },
        dataservice = {
            metadataStore: metadataStore,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodoItem: createTodoItem,
            addAndSaveEntity: addAndSaveEntity,
            deleteAndSaveTodoItem: deleteAndSaveTodoItem,
            deleteAndSaveTodoList: deleteAndSaveTodoList,
            saveEntity: saveEntity,
            suspendSave: false
        };
    return dataservice;
})(breeze, window.TodoApp.dataserviceConfig);