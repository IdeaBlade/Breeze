/// <reference path="todoList.dataservice.js"/>
// ReSharper disable InconsistentNaming
(function (ko, dataservice) {

    dataservice.TodoItem = TodoItem;
    dataservice.TodoList = TodoList;
    
    function TodoItem (data) {
        var self = this;
        data = data || {};

        // Persisted properties
        self.TodoItemId = data.TodoItemId;
        self.Title = ko.observable(data.Title);
        self.IsDone = ko.observable(data.IsDone);
        self.TodoListId = data.TodoListId;

        // Non-persisted properties
        self.ErrorMessage = ko.observable();

        self.save = function () { return dataservice.saveChangedTodoItem(self); };

        // Auto-save when these properties change
        self.IsDone.subscribe(self.save);
        self.Title.subscribe(self.save);
    };
    
    function TodoList(data) {
        var self = this;
        data = data || {};

        // Persisted properties
        self.TodoListId = data.TodoListId;
        self.UserId = data.UserId || "to be replaced";
        self.Title = ko.observable(data.Title || "My todos");
        self.Todos = ko.observableArray(importTodoItems(data.Todos));

        // Non-persisted properties
        self.IsEditingListTitle = ko.observable(false);
        self.NewTodoTitle = ko.observable();
        self.ErrorMessage = ko.observable();
        
        self.save = function () { return dataservice.saveChangedTodoList(self); };
        self.deleteTodo = function () {
            var todoItem = this;
            return dataservice.deleteTodoItem(todoItem)
                 .done(function () { self.Todos.remove(todoItem); });
        };
        
        // Auto-save when these properties change
        self.Title.subscribe(self.save);

    };
    // convert raw todoItem data objects into array of TodoItems
    function importTodoItems(todoItems) {
        return $.map(todoItems || [],
                function (todoItemData) {
                    return dataservice.createTodoItem(todoItemData);
                });
    }
    TodoList.prototype.addTodo = function () {
        var self = this;
        if (self.NewTodoTitle()) { // need a title to save
            var todoItem = dataservice.createTodoItem(
                {
                    Title: self.NewTodoTitle(),
                    TodoListId: self.TodoListId
                });
            self.Todos.push(todoItem);
            dataservice.saveNewTodoItem(todoItem);
            self.NewTodoTitle("");
        }
    };
    
})(ko, TodoApp.dataservice);