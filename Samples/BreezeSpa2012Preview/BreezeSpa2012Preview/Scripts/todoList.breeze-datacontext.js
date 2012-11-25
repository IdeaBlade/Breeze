window.TodoApp.datacontext = (function (breeze, config) {

    var manager = config.createManager(),
        metadataStore = manager.metadataStore,

        datacontext = {
            name: "Breeze",
            metadataStore: metadataStore,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodoItem: createTodoItem,
            saveNewTodoItem: saveNewTodoItem,
            saveNewTodoList: saveNewTodoList,
            deleteTodoItem: deleteTodoItem,
            deleteTodoList: deleteTodoList,
            saveEntity: saveEntity,
            suspendSave: false
        };

    return datacontext;

    function getTodoLists(todoListsObservable, errorObservable) {
        return breeze.EntityQuery
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
    }
    function createTodoItem() {
        return metadataStore.getEntityType("TodoItem").createEntity();
    }
    function createTodoList() {
        return metadataStore.getEntityType("TodoList").createEntity();
    }
    function saveNewTodoItem(todoItem) {
        return saveEntity(manager.addEntity(todoItem));
    }
    function saveNewTodoList(todoList) {
        return saveEntity(manager.addEntity(todoList));
    }
    function deleteTodoItem(todoItem) {
        todoItem.entityAspect.setDeleted();
        return saveEntity(todoItem);
    }
    function deleteTodoList(todoList) {
        var todoItems = todoList.Todos();
        datacontext.suspendSave = true;
        todoList.entityAspect.setDeleted(); // ripple effects 
        datacontext.suspendSave = false;
        return saveEntity(todoList).then(deleteSucceeded);

        function deleteSucceeded() {
            detachEntities(todoItems); // remove orphaned TodoItems from cache
        }
    }
    function saveEntity(entity) {
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
    }
    function cancelAllChanges() {
        datacontext.suspendSave = true;
        manager.rejectChanges();
        datacontext.suspendSave = false;
    }
    function detachEntities(entities) { // remove entities from cache
        entities.forEach(function (entity) { manager.detach(entity); });
    }

})(breeze, window.TodoApp.breezedatacontextConfig);