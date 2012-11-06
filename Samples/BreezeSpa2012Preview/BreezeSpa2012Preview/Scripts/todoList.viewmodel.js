/// <reference path="todoList.dataservice.js"/>
// ReSharper disable InconsistentNaming
(function (ko, dataservice) {
    var 
        todoLists = ko.observableArray(),
        error = ko.observable(),

        addTodoList = function () {
            var todoList = dataservice.createTodoList();
            todoList.IsEditingListTitle(true);
            dataservice.addEntity(todoList)
                .then(showTodoList)
                .fail(addFailed);

            function addFailed() {
                error("Save of new TodoList failed");
            }
        },

        showTodoList= function(todoList) {
            todoLists.unshift(todoList); // Insert new TodoList at the front
        },

        deleteTodoList = function (todoList) {
            todoLists.remove(todoList);
            dataservice.deleteTodoList(todoList)
                .fail(deleteFailed);
            
            function deleteFailed() {
                showTodoList(todoList); // re-show the restored list
            }
        },

        todoListViewModel = {
            todoLists: todoLists,
            error: error,
            addTodoList: addTodoList,
            deleteTodoList: deleteTodoList
        };

    // Load initial state from server
    dataservice.getTodoLists(todoLists, error);

    // Initiate the Knockout bindings
    ko.applyBindings(todoListViewModel);

    $("header p").text("My Breeze Todo List");

})(ko, TodoApp.dataservice);