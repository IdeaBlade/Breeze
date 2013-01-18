(function () {
    window.TodoApp = window.TodoApp || {};

    // Private: Routes
    var todoListUrl = function (id) { return "/api/todolist/" + (id || "") },
        todoItemUrl = function (id) { return "/api/todo/" + (id || "") };

    // Private: Ajax helper
    function ajaxRequest(type, url, data) {
        var options = { dataType: "json", contentType: "application/json", cache: false, type: type, data: ko.toJSON(data) }
        return $.ajax(url, options);
    }

    // Public: Db methods
    window.TodoApp.Db = {
        getLists: function () {
            return ajaxRequest("get", todoListUrl());
        },

        saveList: function (todoList) {
            if (todoList.TodoListId) {
                // Update
                return ajaxRequest("put", todoListUrl(todoList.TodoListId), todoList);
            } else {
                // Create
                return ajaxRequest("post", todoListUrl(), todoList)
                    .done(function (result) {
                        todoList.TodoListId = result.TodoListId;
                        todoList.UserId = result.UserId;
                    });
            }
        },

        deleteList: function (todoListId) {
            return ajaxRequest("delete", todoListUrl(todoListId));
        },

        saveItem: function (todoItem) {
            if (todoItem.TodoItemId) {
                // Update
                return ajaxRequest("put", todoItemUrl(todoItem.TodoItemId), todoItem);
            } else {
                // Create
                return ajaxRequest("post", todoItemUrl(), todoItem)
                    .done(function (result) {
                        todoItem.TodoItemId = result.TodoItemId;
                    });
            }
        },

        deleteItem: function (todoItemId) {
            return ajaxRequest("delete", todoItemUrl(todoItemId));
        }
    };

})();