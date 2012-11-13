/// <reference path="todoList.dataservice.js"/>
// ReSharper disable InconsistentNaming
window.TodoApp = window.TodoApp || {};

window.TodoApp.dataservice = (function (ko) {
    
    // Private: Routes
    var todoListUrl = function (id) { return "/api/todolist/" + (id || ""); },
        todoItemUrl = function (id) { return "/api/todo/" + (id || ""); },

        dataservice = {
            name: "Default",
            getTodoLists: getTodoLists,
            createTodoItem: createTodoItem,
            createTodoList: createTodoList,
            saveNewTodoItem: saveNewTodoItem,
            saveNewTodoList: saveNewTodoList,
            saveChangedTodoItem: saveChangedTodoItem,
            saveChangedTodoList: saveChangedTodoList,
            deleteTodoItem: deleteTodoItem,
            deleteTodoList: deleteTodoList
        };

    return dataservice;
    
    /*** Implementation ***/
    
    function clearErrorMessage (entity) { entity.ErrorMessage(null); }

    // Private: Ajax helper
    function ajaxRequest(type, url, data) {
        var options = {
            dataType: "json",
            contentType: "application/json",
            cache: false,
            type: type,
            data: ko.toJSON(data)
        };
        return $.ajax(url, options);
    }

    function getTodoLists(todoListsObservable, errorObservable) {
        return ajaxRequest("get", todoListUrl())
            .done(getSucceeded)
            .fail(getFailed);

        function getSucceeded(data) {
            var mappedTodoLists = $.map(data, function (list) { return new createTodoList(list); });
            todoListsObservable(mappedTodoLists);
        }

        function getFailed() {
            errorObservable("Error retrieving todo lists.");
        }
    }
    function createTodoItem(data) {
        return new dataservice.TodoItem(data); // TodoItem is injected by model.js
    }
    function createTodoList(data) {
        return new dataservice.TodoList(data); // TodoList is injected by model.js
    }
    function saveNewTodoItem(todoItem) {
        clearErrorMessage(todoItem);
        return ajaxRequest("post", todoItemUrl(), todoItem)
            .done(function (result) {
                todoItem.TodoItemId = result.TodoItemId;
            })
            .fail(function() {
                todoItem.ErrorMessage("Error adding a new todo item.");
            });
    }
    function saveNewTodoList(todoList) {
        clearErrorMessage(todoList);
        return ajaxRequest("post", todoListUrl(), todoList)
            .done(function (result) {
                todoList.TodoListId = result.TodoListId;
                todoList.UserId = result.UserId;
            })
            .fail(function() {
                todoList.ErrorMessage("Error adding a new todo list.");
            });
    }
    function deleteTodoItem(todoItem) {
        return ajaxRequest("delete", todoItemUrl(todoItem.TodoItemId))
            .fail(function() {
                todoItem.ErrorMessage("Error removing todo item.");
            });
    }
    function deleteTodoList(todoList) {
        return ajaxRequest("delete", todoListUrl(todoList.TodoListId))
            .fail(function () {
                todoList.ErrorMessage("Error removing todo list.");
            });
    }
    function saveChangedTodoItem (todoItem) {
        clearErrorMessage(todoItem);
        return ajaxRequest("put", todoItemUrl(todoItem.TodoItemId), todoItem)
            .fail(function () {
                todoItem.ErrorMessage("Error updating todo item.");
            });
    }
    function saveChangedTodoList (todoList) {
        clearErrorMessage(todoList);
        return ajaxRequest("put", todoListUrl(todoList.TodoListId), todoList)
            .fail(function () {
                todoList.ErrorMessage("Error updating the todo list title. Please make sure it is non-empty.");
            });
    }
    
})(ko);