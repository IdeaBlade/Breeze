/// <reference path="todoList.dataAccess.js"/>

(function () {

    function TodoItem(data) {
        var self = this;
        data = data || { };

        // Persisted properties
        self.TodoItemId = data.TodoItemId;
        self.Title = ko.observable(data.Title);
        self.IsDone = ko.observable(data.IsDone);
        self.TodoListId = data.TodoListId;

        // Non-persisted properties
        self.ErrorMessage = ko.observable();

        self.save = function () {
            self.ErrorMessage(null);
            return TodoApp.Db.saveItem(self)
                .fail(function () {
                    var message = self.TodoItemId ? "Error updating todo item." : "Error adding todo item.";
                    self.ErrorMessage(message);
                });
        };

        self.del = function () {
            return TodoApp.Db.deleteItem(self.TodoItemId)
                .fail(function () {
                    self.ErrorMessage("Error removing todo item.");
                });
        };

        // Auto-save when these properties change
        self.IsDone.subscribe(self.save);
        self.Title.subscribe(self.save);
    }

    function TodoList(data) {
        var self = this;
        data = data || {};

        // Persisted properties
        self.TodoListId = data.TodoListId;
        self.UserId = data.UserId;
        self.Title = ko.observable(data.Title);
        self.Todos = ko.observableArray($.map(data.Todos || [], function (todo) {
            return new TodoItem(todo);
        }));

        // Non-persisted properties
        self.IsEditingListTitle = ko.observable(false);
        self.NewTodoTitle = ko.observable();
        self.ErrorMessage = ko.observable();

        self.save = function () {
            self.ErrorMessage(null);
            return TodoApp.Db.saveList(self)
                .fail(function () {
                    var message = self.TodoListId ? "Error updating the todo list title. Please make sure it is non-empty."
                                                  : "Error adding a new todo list.";
                    self.ErrorMessage(message);
                });
        };

        self.del = function () {
            return TodoApp.Db.deleteList(self.TodoListId)
                .fail(function () {
                    self.ErrorMessage("Error removing todo list.");
                });
        };

        self.deleteTodo = function (todo) {
            return todo.del() // Deletes on server
                .done(function () { self.Todos.remove(todo); }); // Deletes on client
        };

        self.addTodo = function () {
            if (self.NewTodoTitle()) {
                var todo = new TodoItem({ Title: self.NewTodoTitle(), TodoListId: self.TodoListId });
                self.Todos.push(todo); // Inserts on client
                todo.save();           // Inserts on server
                self.NewTodoTitle("");
            }
        };

        // Auto-save when these properties change
        self.Title.subscribe(self.save);
    }

    function TodoListViewModel() {
        var self = this;
        self.todoLists = ko.observableArray();
        self.error = ko.observable();
        
        // Operations for the Todo List
        self.addTodoList = function () {
            var todoList = new TodoList({ Title: "My todos", UserId: "to be replaced" });
            self.todoLists.unshift(todoList); // Inserts on client a new item at the beginning of the array
            todoList.save();                  // Inserts on server
            todoList.IsEditingListTitle(true);
        };

        self.deleteTodoList = function (todoList) {
            todoList.del() // Deletes on server
                .done(function () { self.todoLists.remove(todoList); }); // Deletes on client
        };

        // Load initial state from server, convert it to TodoList instances, then populate self.todoLists
        TodoApp.Db.getLists()
            .done(function (allData) {
                var mappedTodoLists = $.map(allData, function (list) { return new TodoList(list); });
                self.todoLists(mappedTodoLists);
            })
            .fail(function () {
                self.error("Error retrieving todo lists.");
            });
    }

    // Initiate the Knockout bindings
    ko.applyBindings(new TodoListViewModel());
})();
