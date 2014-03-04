/***
 * Service: datacontext 
 *
 * Handles all persistence and creation/deletion of app entities
 * using BreezeJS.
 *
 * This FAILING implementation tries to order the changes before saving
 * as would be required by Web API OData but, sadly, Web API OData
 * ignores this order and saves in it's own way which the DB rejects.
 * Holding on to this implementation for future reference.
 *
 ***/
(function () {
    'use strict';

    var serviceId = 'datacontext';
    angular.module('app').factory(serviceId,
    ['$q', 'logger', 'entityManagerFactory', datacontext]);

    function datacontext($q, logger, emFactory) {

        var getLogFn = logger.getLogFn;
        var logError = getLogFn(serviceId, 'error');
        var logInfo = getLogFn(serviceId, 'info');
        var logWarning = getLogFn(serviceId, 'warn');

        var manager = emFactory.newManager();

        var service = {
            getChangesCount: getChangesCount,
            getHasChanges: hasChanges,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodo: createTodo,
            deleteTodo: deleteTodo,
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

        function createTodo(initialValues) {
            // Todo: guard against missing initialValues?
            return manager.createEntity('TodoItem', initialValues);
        }

        function deleteTodo(todo) {
            todo.entityAspect.setDeleted();
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
            if (forceRefresh) {
                if (manager.hasChanges()) {
                    var count = getChangesCount();
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
                logInfo('Got todolists', response, true);
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
            var changes = sortChanges();
            return manager.saveChanges(changes).then(success).catch(failed);

            function success(result) {
                logInfo('Saved data', result, true);
            }

            function failed(error) {
                var msg = 'Save failed: ' +
                    breeze.saveErrorMessageService.getErrorMessage(error);
                error.message = msg;
                logError(msg, error, true);
                return $q.reject(error); // pass error along to next handler
            }
        }

        function sortChanges() {
            /* Aaargh! 
            * Web API OData doesn't calculate the proper save order
            * which means, if we aren't careful on the client,
            * we could save a new TodoItem before we saved its parent new TodoList
            * or delete the parent TodoList before saving its deleted child TodoItems.
            * OData says it is up to the client to save entities in the order
            * required by referential constraints of the database.
            * While we could save each time you make a change, that sucks.
            * So we'll order the pending changes into 4 buckets
            * 1. Deleted Todos
            * 2. Deleted TodoLists
            * 3. Added TodoLists
            * 4. Every other change
            */
            var changes = manager.getChanges();
            var buckets = [[], [], [], []];
            changes.forEach(function (change) {
                var aspect = change.entityAspect;
                var type = change.entityType.shortName;
                if (aspect.entityState === breeze.EntityState.Deleted) {
                    var ix = type === 'TodoItem' ? 0 : 1;
                } else {
                    ix = (aspect.entityState === breeze.EntityState.Added &&
                        type === 'TodoList') ? 2 : 3;
                }
                buckets[ix].push(change);
            });

            return [].concat.apply([], buckets);
        }
    }
})();