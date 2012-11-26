define(function (require) {

    var breeze = require('breeze'),
        serviceName = 'api/todos', // route to the Web Api controller
        manager = new breeze.EntityManager(serviceName);

    var logger = require('logger');

    return {
        getAllTodos: getAllTodos,
        createTodo: createTodo,
        saveChanges: saveChanges,
        purge: purge,
        reset: reset
    };

    /*** implementation details ***/
 
    //#region main application operations
    function getAllTodos(includeArchived) {
        var query = breeze.EntityQuery
                .from("Todos")
                .orderBy("CreatedAt");

        if (!includeArchived) { // exclude archived Todos
            // add filter clause limiting results to non-archived Todos
            query = query.where("IsArchived", "==", false);
            //query = query.where("IsArchived", breeze.FilterQueryOp.Equals, false);
        }

        return manager.executeQuery(query);
    }

    function createTodo() {
        var todoType = manager.metadataStore.getEntityType("TodoItem");
        var newTodo = todoType.createEntity();
        return manager.addEntity(newTodo);
    }
   
    function saveChanges() {
        if (manager.hasChanges()) {
            manager.saveChanges()
                .then(saveSucceeded)
                .fail(saveFailed);
        } else {
            logger.info("Nothing to save");
        };
    }
    function saveSucceeded(saveResult) {
        logger.success("# of Todos saved = " + saveResult.entities.length);
        logger.log(saveResult);
    }
    
    function saveFailed(error) {
        var reason = error.message;
        var detail = error.detail;
        
        if (reason === "Validation error") {
            handleSaveValidationError(error);
            return;
        }
        if (detail && detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
            // Concurrency error 
            reason =
                "Another user, perhaps the server, may have deleted one or all of the todos.";
            manager.rejectChanges(); // DEMO ONLY: discard all pending changes
        }

        logger.error(error,
            "Failed to save changes. " + reason +
            " You may have to restart the app.");
    };
    
    function handleSaveValidationError(error) {
        var message = "Not saved due to validation error";
        try { // fish out the first error
            var firstErr = error.entitiesWithErrors[0].entityAspect.getValidationErrors()[0];
            message += ": " + firstErr.errorMessage;
        } catch (e) { /* eat it for now */ }
        logger.error(message);
    }
    
    //#endregion
    
    //#region demo operations
    function purge(callback) {
        // Todo: breeze should support commands to the controller
        // Simplified: fails silently
        $.post(serviceName + '/purge', function () {
            logger.success("database purged.");
            if (callback) callback();
        });
    }

    function reset(callback) {
        // Todo: breeze should support commands to the controller
        // Simplified: fails silently
        $.post(serviceName + '/reset', function () {
            logger.success("database reset.");
            if (callback) callback();
        });
    }
    //#endregion

});