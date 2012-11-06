/// <reference path="todoList.dataservice.js"/>
// ReSharper disable InconsistentNaming
(function (ko, dataservice) {
    var 
        todoLists = ko.observableArray(),
        error = ko.observable(),

        addTodoList = function () {
            var todoList = dataservice.createTodoList();
            todoList.Title("My todos");
            todoList.UserId("to be replaced");
            todoList.IsEditingListTitle(true);
            dataservice
                .addEntity(todoList)
                .then(insertTodoList);
        },

        // Insert new TodoList at the front of the array
        insertTodoList= function(todoList) {
            todoLists.unshift(todoList); 
        },

        deleteTodoList = function (todoList) {
            todoLists.remove(todoList);
            dataservice
                .deleteTodoList(todoList)
                .fail(function () { insertTodoList(todoList); });
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