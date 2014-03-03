/***
 * Controller/ViewModel: todolists 
 *
 * Support a view of all TodoLists
 *
 * Handles fetch and save of these lists
 *
 ***/
(function () {
    'use strict';

    var controllerId = 'todolists';
    angular.module('app').controller(controllerId,
    ['datacontext', 'logger', todoLists]);

    function todoLists(datacontext, logger) {
        logger = logger.forSource(controllerId);
        var logError = logger.logError;
        var logSuccess = logger.logSuccess;

        var editTodoList = null;
        var isSaving = false;

        var vm = this;
        vm.addNewTodoList = addTodoList;
        vm.closeDiscardNewTodoList = closeDiscardNewTodoList;
        vm.closeNewTodoList = closeNewTodoList;
        vm.changesCount = changesCount;
        vm.deleteTodoList = deleteTodoList;
        vm.editBegin = editBegin;
        vm.editEnd = editEnd;
        vm.isAddingTodoList = false;
        vm.isEditing = isEditing;
        vm.isSaveDisabled = isSaveDisabled;
        vm.newTodoListTitle = '';
        vm.refresh = refresh;
        vm.save = save;
        vm.todoLists = [];
        vm.toggleIsAddingTodoList = toggleIsAddingTodoList;

        initialize();

        /*** implementation ***/

        function initialize() {
            getTodoLists();
        }

        function addTodoList() {
            vm.isAddingTodoList = true;
            var title = vm.newTodoListTitle.trim();
            if (title) {
                var newList = datacontext.createTodoList({title: title});
                vm.todoLists.unshift(newList);
                vm.newTodoListTitle = '';
            }
        }
        function closeDiscardNewTodoList() {
            vm.newTodoListTitle = '';
            vm.isAddingTodoList = false;
        }
        function closeNewTodoList() {
            var title = vm.newTodoListTitle.trim();
            if (title) {
                var newList = datacontext.createTodoList({ title: title });
                vm.todoLists.unshift(newList);
            }
            vm.newTodoListTitle = '';
            vm.isAddingTodoList = false;
        }
        function changesCount() {
            return datacontext.getChangesCount();
        }
        function deleteTodoList(todoList) {
            var ix = vm.todoLists.indexOf(todoList);
            if (ix > -1) {
                // remove from the list
                vm.todoLists.splice(ix, 1);
                // mark for delete but do not save
                datacontext.deleteTodoList(todoList);
            }
        }
        function isSaveDisabled() {
            return isSaving || !datacontext.getHasChanges();
        }
        function editBegin(todoList) {
            editTodoList = todoList;
        }
        function editEnd() {
            editTodoList = null;
        }
        function isEditing(todoList) {
            return editTodoList === todoList;
        }
        function getTodoLists(forceRefresh) {
            return datacontext.getTodoLists(forceRefresh).then(function (data) {
                return vm.todoLists = data;
            });
        }
        function refresh() {
            var changeCount = datacontext.getChangesCount();
            if (changeCount) {
                // Todo: show modal dialog and offer to cancel
                alert('Uh oh, you\'re about to loose changes: ' + changeCount);
            }

            vm.todolists = [];
            return getTodoLists(true).then(function (data) {
                vm.todoLists = data;
                logSuccess('Hooray, refresh successful');
            });
        }
        function save() {
            isSaving = true;
            return datacontext.save()
                .then(function() {
                    logSuccess("Hooray we saved", null, true);
                })
                .catch(function (error) {
                    logError("Boooo, we failed: " + error.message, null, true);
                    // Todo: more sophisticated recovery. 
                    // Here we just blew it all away and start over
                    refresh();
                })
                .finally(function() {
                    isSaving = false;
                });
        }
        function toggleIsAddingTodoList() {
            vm.isAddingTodoList = !vm.isAddingTodoList;
        }
    }
})();