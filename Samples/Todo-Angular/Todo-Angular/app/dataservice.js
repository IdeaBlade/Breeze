/* dataservice: data access and model management layer 
 * relies on Angular injector to provide:
 *     $timeout - Angular equivalent of 'setTimeout'
 *     breeze - the Breeze.Angular service (which is breeze itself)
 *     logger - the application's logging facility
 */
(function() {

    angular.module('app').factory('dataservice',
    ['$timeout', 'breeze', 'logger', dataservice]);

    function dataservice($timeout, breeze, logger) {

        var serviceName = 'breeze/todos'; // route to the same origin Web Api controller

        // *** Cross origin service example  ***
        // When data server and application server are in different origins
        //var serviceName = 'http://todo.breezejs.com/breeze/todos'; 

        var manager = new breeze.EntityManager(serviceName);
        manager.enableSaveQueuing(true);

        var service = {
            addPropertyChangeHandler: addPropertyChangeHandler,
            createTodo: createTodo,
            deleteTodo: deleteTodo,
            getTodos: getTodos,
            hasChanges: hasChanges,
            purge: purge,
            reset: reset,
            saveChanges: saveChanges
        };
        return service;

        /*** implementation details ***/

        function addPropertyChangeHandler(handler) {
            // call handler when an entity property of any entity changes
            return manager.entityChanged.subscribe(function(changeArgs) {
                var action = changeArgs.entityAction;
                if (action === breeze.EntityAction.PropertyChange) {
                    handler(changeArgs);
                }
            });
        }

        function createTodo(initialValues) {
            return manager.createEntity('TodoItem', initialValues);
        }

        function deleteTodo(todoItem) {
            todoItem && todoItem.entityAspect.setDeleted();
        }

        function getTodos(includeArchived) {
            var query = breeze.EntityQuery
                .from("Todos")
                .orderBy("CreatedAt");

            if (!includeArchived) { // if excluding archived Todos ...
                // add filter clause limiting results to non-archived Todos
                query = query.where("IsArchived", "==", false);
            }

            var promise = manager.executeQuery(query).catch(queryFailed);
            return promise;

            function queryFailed(error) {
                logger.error(error.message, "Query failed");
                throw error; // so downstream promise users know it failed
            }
        }

        function hasChanges() {
            return manager.hasChanges();
        }

        function handleSaveValidationError(error) {
            var message = "Not saved due to validation error";
            try { // fish out the first error
                var firstErr = error.entityErrors[0];
                message += ": " + firstErr.errorMessage;
            } catch (e) { /* eat it for now */ }
            return message;
        }

        function purge(callback) {
            // Todo: breeze should support commands to the controller
            // Simplified: fails silently
            $.post(serviceName + '/purge', function() {
                logger.success("database purged.");
                manager.clear();
                if (callback) callback();
            });
        }

        function reset(callback) {
            // Todo: breeze should support commands to the controller
            // Simplified: fails silently
            $.post(serviceName + '/reset', function() {
                logger.success("database reset.");
                manager.clear();
                if (callback) callback();
            });
        }

        function saveChanges() {
            return manager.saveChanges()
                .then(saveSucceeded)
                .catch(saveFailed);

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
                $timeout(function() {
                    manager.rejectChanges();
                }, 1000);
                throw error; // so downstream promise users know it failed
            }

        }
    }

})();