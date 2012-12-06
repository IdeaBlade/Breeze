/// <reference path="todo.datacontext.js"/>
(function (ko, datacontext) {

    var store = datacontext.metadataStore;
    store.registerEntityTypeCtor("TodoItem", function () { }, TodoItemInitializer);
    store.registerEntityTypeCtor("TodoList", TodoList, TodoListInitializer);

    function TodoItemInitializer(todoItem) {
        todoItem.ErrorMessage = ko.observable();
    }
    
    function TodoListInitializer(todoList) {
        todoList.ErrorMessage = ko.observable();
        todoList.IsEditingListTitle = ko.observable(false);
        todoList.NewTodoTitle = ko.observable();
    }
    
    function TodoList() {
        var self = this;
        self.Title = "My todos";       // defaults
        self.UserId = "to be replaced";
    }

    TodoList.prototype.addTodo = function() {
        var self = this;
        if (self.NewTodoTitle()) { // need a title to save
            var todoItem = datacontext.createTodoItem();
            todoItem.Title(self.NewTodoTitle());
            todoItem.TodoList(self);
            datacontext.saveNewTodoItem(todoItem);
            self.NewTodoTitle("");
        }
    };
    
    TodoList.prototype.deleteTodo = function () {
        return datacontext.deleteTodoItem(this); // "this" is the todoItem
    };
    
})(ko, todoApp.datacontext);