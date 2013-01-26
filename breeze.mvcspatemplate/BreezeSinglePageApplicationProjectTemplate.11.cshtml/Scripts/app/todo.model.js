(function (ko, datacontext) {

    var store = datacontext.metadataStore;
    store.registerEntityTypeCtor("TodoItem", null, todoItemInitializer);
    store.registerEntityTypeCtor("TodoList", TodoList, todoListInitializer);

    function todoItemInitializer(todoItem) {
        todoItem.errorMessage = ko.observable();
    }
    
    function todoListInitializer(todoList) {
        todoList.errorMessage = ko.observable();
        todoList.isEditingListTitle = ko.observable(false);
        todoList.newTodoTitle = ko.observable();
    }
    
    function TodoList() {
        this.title = "My todos";       // defaults
        this.userId = "to be replaced";
    }

    TodoList.prototype.addTodo = function() {
        var todoList = this;
        var title = todoList.newTodoTitle();
        if (title) { // need a title to save
            todoList.newTodoTitle("");
            var todoItem = datacontext.createTodoItem();
            todoItem.title(title);
            todoItem.todoList(todoList);
            datacontext.saveNewTodoItem(todoItem);
        }
    };
    
    TodoList.prototype.deleteTodo = function () {
        return datacontext.deleteTodoItem(this); // "this" is the todoItem
    };
    
})(ko, todoApp.datacontext);