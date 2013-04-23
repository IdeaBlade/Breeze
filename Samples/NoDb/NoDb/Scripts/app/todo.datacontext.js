window.todoApp = window.TodoApp || {};

window.todoApp.datacontext = (function (breeze) {

    breeze.NamingConvention.camelCase.setAsDefault();
 
    var dataService = new breeze.DataService({
        serviceName: "breeze/Todo",
        hasServerMetadata: false // don't ask the server for metadata
    });

    var manager = new breeze.EntityManager({ dataService: dataService });
    var metadataStore = manager.metadataStore;
    manager.enableSaveQueuing(true);
    configureManagerToSaveModifiedItemImmediately();

    var datacontext = {
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
            .from("TodoLists")  
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
    
    function createTodoItem(initialValues) {
        return manager.createEntity("TodoItem", initialValues);
    }
    
    function createTodoList(initialValues) {
        return manager.createEntity("TodoList", initialValues);
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
        // Neither breeze nor server cascade deletes so we have to do it
        var todoItems = todoList.todos().slice(); // iterate over copy
        todoItems.forEach(function(entity) { entity.entityAspect.setDeleted(); });
        todoList.entityAspect.setDeleted();
        return saveEntity(todoList);
    }

    function saveEntity(masterEntity) {

        return manager.saveChanges().fail(saveFailed);

        function saveFailed(error) {
            setErrorMessage(error);
            // Let them see it "wrong" briefly before reverting"
            setTimeout(function() { manager.rejectChanges(); }, 1000);
            throw error; // so caller can see failure
        }

        function setErrorMessage(error) {
            var statename = masterEntity.entityAspect.entityState.name.toLowerCase();
            var typeName = masterEntity.entityType.shortName;
            var msg = "Error saving " + statename + " " + typeName + ": ";

            var reason = error.message;

            if (reason.match(/validation error/i)) {
                reason = getValidationErrorMessage(error);
            } else if (isConcurrencyError(error)) {
                reason =
                    "can't find " + typeName + "; another user may have deleted it.";
            }
            masterEntity.errorMessage(msg + reason);
        }

        function getValidationErrorMessage(error) {
            try { // return the first error message
                var firstItem = error.entitiesWithErrors[0];
                var firstError = firstItem.entityAspect.getValidationErrors()[0];
                return firstError.errorMessage;
            } catch(e) { // ignore problem extracting error message 
                return "validation error";
            }
        }
    }

    function isConcurrencyError(error) {
        var detail = error.detail;
        return detail && detail.ExceptionMessage &&
            detail.ExceptionMessage.match(/can't find/i);
    }
    
    function configureManagerToSaveModifiedItemImmediately() {
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