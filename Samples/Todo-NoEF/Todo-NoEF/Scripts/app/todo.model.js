/// <reference path="todo.datacontext.js"/>
(function (ko, datacontext) {

    var store = datacontext.metadataStore;
    store.registerEntityTypeCtor("ToDoItem", function () { }, ToDoItemInitializer);
    store.registerEntityTypeCtor("ToDoList", ToDoList, ToDoListInitializer);

    function ToDoItemInitializer(todoItem) {
        todoItem.ErrorMessage = ko.observable();
    }
    
    function ToDoListInitializer(todoList) {
        todoList.ErrorMessage = ko.observable();
        todoList.IsEditingListTitle = ko.observable(false);
        todoList.NewToDoTitle = ko.observable();
    }
    
    function ToDoList() {
        var self = this;
        self.Title = "My todos";       // defaults
        self.UserId = "to be replaced";
    }

    ToDoList.prototype.addToDo = function() {
        var self = this;
        if (self.NewToDoTitle()) { // need a title to save
            var todoItem = datacontext.createToDoItem();
            todoItem.Title(self.NewToDoTitle());
            todoItem.ToDoList(self);
            datacontext.saveNewToDoItem(todoItem);
            self.NewToDoTitle("");
        }
    };
    
    ToDoList.prototype.deleteToDo = function () {
        return datacontext.deleteToDoItem(this); // "this" is the todoItem
    };
    
})(ko, todoApp.datacontext);