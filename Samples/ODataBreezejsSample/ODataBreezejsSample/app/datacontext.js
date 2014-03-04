/***
 * Service: datacontext 
 *
 * Handles all persistence and creation/deletion of app entities
 * using BreezeJS.
 *
 ***/
(function () {
    'use strict';

    var serviceId = 'datacontext';
    angular.module('app').factory(serviceId,
    ['$q', 'logger', 'entityManagerFactory', datacontext]);

    function datacontext($q, logger, emFactory) {
        logger = logger.forSource(serviceId);
        var logError = logger.logError;
        var logSuccess = logger.logSuccess;
        var logWarning = logger.logWarning;

        var manager = emFactory.newManager();

        var service = {
            getChangesCount: getChangesCount,
            getHasChanges: hasChanges,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodoItem: createTodoItem,
            deleteTodoItem: deleteTodoItem,
            deleteTodoList: deleteTodoList,
            save: save
        };

        return service;

        /*** implementation ***/

        function createTodoList(initialValues) {
            var created = new Date().toUTCString();
            initialValues = initialValues || {title: '[New TodoList]'};
            initialValues.created = initialValues.created || created;
            return manager.createEntity('TodoList', initialValues);
        }

        function createTodoItem(initialValues) {
            // Todo: guard against missing initialValues?
            return manager.createEntity('TodoItem', initialValues);
        }

        function deleteTodoItem(todoItem) {
            todoItem.entityAspect.setDeleted();
        }

        function deleteTodoList(todoList) {
            // first mark deleted all the child TodoItems (via copies)
            var todoCopies = todoList.todoItems.slice();
            todoCopies.forEach(function (td) { td.entityAspect.setDeleted(); });
            // now mark deleted the parent TodoList 
            todoList.entityAspect.setDeleted();
        }

        function getChangesCount() {
             return manager.getChanges().length;
        }

        function getTodoLists(forceRefresh) {
            var count;
            if (forceRefresh) {
                if (manager.hasChanges()) {
                    count = getChangesCount();
                    manager.rejectChanges(); // undo all unsaved changes!
                    logWarning('Discarded ' + count + ' pending change(s)', null, true);
                }
            }

            //Todo: when no forceRefresh, consider getting from cache rather than remotely
            return breeze.EntityQuery.from('TodoLists')
                .orderBy('created desc, title')
                .expand("TodoItems")
                .using(manager).execute()
                .then(success).catch(failed);

            function success(response) {
                count = response.results.length;
                logSuccess('Got '+count+' todolist(s)', response, true);
                return response.results;
            }
            function failed(error) {
                var message = error.message || "todolists query failed";
                logError(message, error, true);
            }
        }

        function hasChanges() {
             return manager.hasChanges();
        }

        function save() {
            var count = getChangesCount();
            var promise = null;
            var saveBatches = prepareSaveBatches();
            saveBatches.forEach(function (batch) {
                // ignore empty batches (except 'null' which means "save everything else")
                if (batch == null || batch.length > 0) {
                    promise = promise ?
                        promise.then(function () { return manager.saveChanges(batch); }) :
                        manager.saveChanges(batch);
                }
            });
            return promise.then(success).catch(failed);

            function success(result) {
                logSuccess('Saved ' + count + ' change(s)', result, true);
            }

            function failed(error) {
                var msg = 'Save failed. ' + (error.message || "");
                error.message = msg;
                logError(msg, error, true);
                return $q.reject(error); // pass error along to next handler
            }

            function prepareSaveBatches() {
                /* Aaargh! 
                * Web API OData doesn't calculate the proper save order
                * which means, if we aren't careful on the client,
                * we could save a new TodoItem before we saved its parent new TodoList
                * or delete the parent TodoList before saving its deleted child TodoItems.
                * OData says it is up to the client to save entities in the order
                * required by referential constraints of the database.
                * While we could save each time you make a change, that sucks.
                * So we'll divvy up the pending changes into 4 batches
                * 1. Deleted Todos
                * 2. Deleted TodoLists
                * 3. Added TodoLists
                * 4. Every other change
                */
                var batches = [];
                batches.push(manager.getEntities(['TodoItem'], [breeze.EntityState.Deleted]));
                batches.push(manager.getEntities(['TodoList'], [breeze.EntityState.Deleted]));
                batches.push(manager.getEntities(['TodoList'], [breeze.EntityState.Added]));
                batches.push(null); // empty = save all remaining pending changes
                return batches;
                /*
                 *  No we can't flatten into one request because Web API OData reorders
                 *  arbitrarily, causing the database failure we're trying to avoid.
                 */
            }
        }
    }
})();