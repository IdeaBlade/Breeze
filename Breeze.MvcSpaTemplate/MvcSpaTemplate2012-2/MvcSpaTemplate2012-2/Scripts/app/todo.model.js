(function (ko, datacontext) {
    datacontext.todoItem = todoItem;
    datacontext.todoList = todoList;

    function todoItem(data) {
        var self = this;
        data = data || {};

        // Persisted properties
        self.todoItemId = data.todoItemId;
        self.title = ko.observable(data.title);
        self.isDone = ko.observable(data.isDone);
        self.todoListId = data.todoListId;

        // Non-persisted properties
        self.errorMessage = ko.observable();

        saveChanges = function () {
            return datacontext.saveChangedTodoItem(self);
        };

        // Auto-save when these properties change
        self.isDone.subscribe(saveChanges);
        self.title.subscribe(saveChanges);

        self.toJson = function () { return ko.toJSON(self) };
    };

    function todoList(data) {
        var self = this;
        data = data || {};

        // Persisted properties
        self.todoListId = data.todoListId;
        self.userId = data.userId || "to be replaced";
        self.title = ko.observable(data.title || "My todos");
        self.todos = ko.observableArray(importTodoItems(data.todos));

        // Non-persisted properties
        self.isEditingListTitle = ko.observable(false);
        self.newTodoTitle = ko.observable();
        self.errorMessage = ko.observable();

        self.deleteTodo = function () {
            var todoItem = this;
            return datacontext.deleteTodoItem(todoItem)
                 .done(function () { self.todos.remove(todoItem); });
        };

        // Auto-save when these properties change
        self.title.subscribe(function () {
            return datacontext.saveChangedTodoList(self);
        });

        self.toJson = function () { return ko.toJSON(self) };
    };
    // convert raw todoItem data objects into array of TodoItems
    function importTodoItems(todoItems) {
        return $.map(todoItems || [],
                function (todoItemData) {
                    return datacontext.createTodoItem(todoItemData);
                });
    }
    todoList.prototype.addTodo = function () {
        var self = this;
        if (self.newTodoTitle()) { // need a title to save
            var todoItem = datacontext.createTodoItem(
                {
                    title: self.newTodoTitle(),
                    todoListId: self.todoListId
                });
            self.todos.push(todoItem);
            datacontext.saveNewTodoItem(todoItem);
            self.newTodoTitle("");
        }
    };
})(ko, todoApp.datacontext);