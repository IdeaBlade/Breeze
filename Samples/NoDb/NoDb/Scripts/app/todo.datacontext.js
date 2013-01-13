/// <reference path="todo.model.js"/>
window.todoApp = window.TodoApp || {};

window.todoApp.datacontext = (function (breeze) {

    breeze.NamingConvention.camelCase.setAsDefault();

    var serviceName = "api/Todo";
    
    var dataService = new breeze.DataService({
        serviceName: serviceName,
        hasServerMetadata: false
    });

    var manager = new breeze.EntityManager({dataService: dataService});
    var metadataStore = manager.metadataStore;
    configureManagerToSaveOnModify();

    var datacontext = {
            name: "Breeze",
            metadataStore: metadataStore,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodoItem: createTodoItem,
            saveNewTodoItem: saveNewTodoItem,
            saveNewTodoList: saveNewTodoList,
            deleteTodoItem: deleteTodoItem,
            deleteTodoList: deleteTodoList
        };

    return datacontext;

    //#region Private Members
    function getTodoLists(todoListsObservable, errorObservable) {
        return breeze.EntityQuery
            .from("TodoLists")    // .expand("Todos")
            .using(manager).execute()
            .then(getSucceeded)
            .fail(getFailed);

        function getSucceeded(data) {
            todoListsObservable(data.results);
        }

        function getFailed(error) {
            errorObservable("Error retrieving todo lists: " + error.message);
        }
    }
    
    function createTodoItem() {
        var item = metadataStore.getEntityType("TodoItem").createEntity();
        manager.addEntity(item);
        return item;
    }
    
    function createTodoList() {
        var list = metadataStore.getEntityType("TodoList").createEntity();
        manager.addEntity(list);
        return list;
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
        // breeze doesn't cascade delete so we have to do it
        var todoItems = todoList.todos().slice(); // iterate over copy
        todoItems.forEach(function(entity) { entity.entityAspect.setDeleted(); });
        todoList.entityAspect.setDeleted();
        return saveEntity(todoList);
    }

    function saveEntity(masterEntity) {

        return manager.saveChanges().fail(saveFailed);
       
        function saveFailed(error) {
            setSaveErrorMessage(error);
            manager.rejectChanges();
            throw error; // so caller can see failure
        }

        function setSaveErrorMessage(error) {
            var statename = masterEntity.entityAspect.entityState.name.toLowerCase();
            var typeName = masterEntity.entityType.shortName;
            var msg = "Error saving " + statename + " " + typeName + ": ";   
            
            var reason = error.message;
            var detail = error.detail;

            if (reason === "Validation error") {
                reason = getValidationError(error);
            } else if (detail && detail.ExceptionMessage &&
                       detail.ExceptionMessage.indexOf('Unable to locate') > -1) {
                // Concurrency error 
                reason = "can't find "+ typeName + 
                         "; another user may have deleted it.";
            }
            masterEntity.errorMessage(msg + reason);
        };
        
        function getValidationError(error) {
            try { // fish out the first error
                var firstErr = error.entitiesWithErrors[0].entityAspect.getValidationErrors()[0];
                return firstErr.errorMessage;
            } catch (e) { /* eat it for now */ }
            return "validation error";
        }
    }
    
    function configureManagerToSaveOnModify() {
        manager.entityChanged.subscribe(function (args) {
            if (args.entityAction === breeze.EntityAction.EntityStateChange) {
                var entity = args.entity;
                if (entity.entityAspect.entityState.isModified()) {
                    saveEntity(entity);
                }
            }
        });
    }   
    //#endregion
    
})(breeze);