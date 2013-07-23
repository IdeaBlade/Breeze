app.dataservice = (function (breeze, logger) {

    var serviceName = 'breeze/todos'; // route to the same origin Web Api controller

    // *** Cross origin service example  ***
    //var serviceName = 'http://todo.breezejs.com/breeze/todos'; // controller in different origin

    var manager = new breeze.EntityManager(serviceName);
    manager.enableSaveQueuing(true);

    return {
        getAllTodos: getAllTodos,
        createTodo: createTodo,
        saveChanges: saveChanges,
        purge: purge,
        reset: reset,
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
        }

        return manager.executeQuery(query);
    }

    function createTodo(initialValues) {
        return manager.createEntity('TodoItem', initialValues);
    }

    function saveChanges() {
        return manager.saveChanges()
            .then(saveSucceeded)
            .fail(saveFailed);

        function saveSucceeded(saveResult) {
            logger.success("# of Todos saved = " + saveResult.entities.length);
            logger.log(saveResult);
        }

        function saveFailed(error) {
            var reason = error.message;
            var detail = error.detail;

            if (error.entityErrors) {
                reason = handleSaveValidationError(error);
            } else if (detail && detail.ExceptionType &&
                detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
                // Concurrency error 
                reason =
                    "Another user, perhaps the server, " +
                    "may have deleted one or all of the todos." +
                    " You may have to restart the app.";
            } else {
                reason = "Failed to save changes: " + reason +
                         " You may have to restart the app.";
            }

            logger.error(error, reason);
            // DEMO ONLY: discard all pending changes
            // Let them see the error for a second before rejecting changes
            setTimeout(function() {
                manager.rejectChanges();
            }, 1000);
            throw error; // so caller can see it
        }
    }
    
    function handleSaveValidationError(error) {
        var message = "Not saved due to validation error";
        try { // fish out the first error
            var firstErr = error.entityErrors[0];
            message += ": " + firstErr.errorMessage;
        } catch (e) { /* eat it for now */ }
        return message;
    }

    //#endregion

    //#region demo operations
    function purge(callback) {
        // Todo: breeze should support commands to the controller
        // Simplified: fails silently
        $.post(serviceName + '/purge', function () {
            logger.success("database purged.");
            manager.clear();
            if (callback) callback();
        });
    }

    function reset(callback) {
        // Todo: breeze should support commands to the controller
        // Simplified: fails silently
        $.post(serviceName + '/reset', function () {
            logger.success("database reset.");
            manager.clear();
            if (callback) callback();
        });
    }
    //#endregion

})(breeze, app.logger);