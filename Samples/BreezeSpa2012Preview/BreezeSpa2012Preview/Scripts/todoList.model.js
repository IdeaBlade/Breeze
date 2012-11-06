/// <reference path="todoList.dataservice.js"/>
// ReSharper disable InconsistentNaming
(function (ko, dataservice) {

    var store = dataservice.metadataStore;
    store.registerEntityTypeCtor('TodoItem', function () { }, TodoItemInitializer);
    store.registerEntityTypeCtor('TodoList', TodoList, TodoListInitializer);

    function TodoItemInitializer(todoItem) {
        var self = todoItem;
        self.ErrorMessage = ko.observable();
        subscribeOnModified(self);
    }

    function TodoListInitializer(todoList) {
        var self = todoList;
        self.ErrorMessage = ko.observable();
        self.IsEditingListTitle = ko.observable(false);
        self.NewTodoTitle = ko.observable();
        subscribeOnModified(self);
    }

    function TodoList() {
        this.Title  = "My todos";       // defaults
        this.UserId = "to be replaced";
    };
    TodoList.prototype.addTodo = function () {
        var self = this;
        if (!self.NewTodoTitle()) { return null; } // need a title to save
        var todoItem = dataservice.createTodoItem();
        todoItem.Title(self.NewTodoTitle());
        self.NewTodoTitle("");
        todoItem.TodoList(self);
        return dataservice.addEntity(todoItem);
    };
    TodoList.prototype.deleteTodo = function () {
        return dataservice.deleteTodoItem(this);
    };

    function subscribeOnModified(entity) {
        entity.entityAspect.propertyChanged.subscribe(saveOnModified);
    }
    function saveOnModified(args) {
        var entity = args.entity;
        if (!dataservice.suspendSave &&
            entity.entityAspect.entityState.isModified()) {
            dataservice.saveEntity(entity);
        };
    }
    
})(ko, TodoApp.dataservice);