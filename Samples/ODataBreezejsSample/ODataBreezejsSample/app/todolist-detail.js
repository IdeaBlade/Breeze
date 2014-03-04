/***
 * Controller/ViewModel: todolistdetail 
 *
 * Support a view of a single TodoList and its TodoItems.
 * - this view is a subview of a view of a list of TodoLists.
 * - 'vm' is the name of the controller for that parent view
 * 
 * Example of the template that created this subview: 
 *   <div data-ng-repeat="todoList in vm.todoLists">
 *      <div data-ng-include="'/app/todolist-detail.html'"></div>
 *   </div>
 ***/
(function () {
    'use strict';

    var controllerId = 'todolist-detail';
    angular.module('app').controller(controllerId,
    ['$scope', 'datacontext', todoListDetail]);

    function todoListDetail($scope, datacontext) {
        // The TodoList for which this controller is the ViewModel
        var todoList = $scope.todoList;

        // The ViewModel of all todoLists (whose name is known to be 'vm')
        var todoListsVm = $scope.vm; 

        var editObject = null; // whatever we're currently editing (TodoItem or TodoList)

        var vm = this; 
        vm.addTodoItem = addTodoItem;
        vm.deleteTodoItem = deleteTodoItem;
        vm.deleteTodoList = deleteTodoList;
        vm.editBegin = editBegin;
        vm.editEnd = editEnd;
        vm.isEditing = isEditing;
        vm.newTodoItemDescription = "";
        vm.todoItems = todoItems;
        vm.todoList = todoList;

        /*** implementation ***/

        function addTodoItem() {
            var description = vm.newTodoItemDescription.trim();
            if (description) {
                datacontext.createTodoItem({
                    todoList: todoList,
                    isDone: false,
                    description: description
                });
                vm.newTodoItemDescription = '';
            }
        }

        function deleteTodoItem(todoItem) {
            // mark for delete but do not save
            datacontext.deleteTodoItem(todoItem); 
        }

        function deleteTodoList() {
            // Delegate up to parent viewmodel as it knows how 
            // to delete a todolist and remove it from its lists.
            // Alternative: broadcast an Angular message.
            todoListsVm.deleteTodoList(todoList);
        }

        function editBegin(obj) { editObject = obj; }

        function editEnd() { editObject = null; }

        function isEditing(obj) { return editObject === obj; }

        function todoItems() { return todoList.todoItems; }
    }
})();