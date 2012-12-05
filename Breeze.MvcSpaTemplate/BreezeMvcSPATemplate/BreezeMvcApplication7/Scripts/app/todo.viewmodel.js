window.todoApp.todoListViewModel = (function (ko, datacontext) {
    var todoLists = ko.observableArray(),
        error = ko.observable(),
        addTodoList = function () {
            var todoList = datacontext.createTodoList();
            todoList.IsEditingListTitle(true);
            datacontext.saveNewTodoList(todoList)
                .then(addSucceeded)
                .fail(addFailed);

            function addSucceeded() {
                showTodoList(todoList);
            }
            function addFailed() {
                error("Save of new TodoList failed");
            }
        },
        showTodoList = function (todoList) {
            todoLists.unshift(todoList); // Insert new TodoList at the front
        },
        deleteTodoList = function (todoList) {
            todoLists.remove(todoList);
            datacontext.deleteTodoList(todoList)
                .fail(deleteFailed);

            function deleteFailed() {
                showTodoList(todoList); // re-show the restored list
            }
        };

    datacontext.getTodoLists(todoLists, error); // load TodoLists

    return {
        todoLists: todoLists,
        error: error,
        addTodoList: addTodoList,
        deleteTodoList: deleteTodoList
    };

})(ko, todoApp.datacontext);

// Initiate the Knockout bindings
ko.applyBindings(window.todoApp.todoListViewModel);
