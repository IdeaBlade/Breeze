/// <reference path="todoList.dataservice.js"/>
// ReSharper disable InconsistentNaming
window.TodoApp.todoListViewModel = (function (ko, dataservice) {
    var
        todoLists = ko.observableArray(),
        error = ko.observable(),
        addTodoList = function () {
            var todoList = dataservice.createTodoList();
            todoList.IsEditingListTitle(true);
            dataservice.saveNewTodoList(todoList)
                .then(showTodoList)
                .fail(addFailed);

            function addFailed() {
                error("Save of new TodoList failed");
            }
        },
        showTodoList = function (todoList) {
            todoLists.unshift(todoList); // Insert new TodoList at the front
        },
        deleteTodoList = function (todoList) {
            todoLists.remove(todoList);
            dataservice.deleteTodoList(todoList)
                .fail(deleteFailed);

            function deleteFailed() {
                showTodoList(todoList); // re-show the restored list
            }
        };

    dataservice.getTodoLists(todoLists, error); // load TodoLists

    return {
        todoLists: todoLists,
        error: error,
        addTodoList: addTodoList,
        deleteTodoList: deleteTodoList
    };

})(ko, TodoApp.dataservice);

// Initiate the Knockout bindings
ko.applyBindings(window.TodoApp.todoListViewModel);
$("header p").text("My " + TodoApp.dataservice.name + " Todo List");