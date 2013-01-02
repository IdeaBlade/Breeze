window.todoApp.todoListViewModel = (function (ko, datacontext) {
    var todoLists = ko.observableArray(),
        error = ko.observable(),
        addToDoList = function () {
            var todoList = datacontext.createToDoList();
            todoList.IsEditingListTitle(true);
            datacontext.saveNewToDoList(todoList)
                .then(addSucceeded)
                .fail(addFailed);

            function addSucceeded() {
                showToDoList(todoList);
            }
            function addFailed() {
                error("Save of new ToDoList failed");
            }
        },
        showToDoList = function (todoList) {
            todoLists.unshift(todoList); // Insert new ToDoList at the front
        },
        deleteToDoList = function (todoList) {
            todoLists.remove(todoList);
            datacontext.deleteToDoList(todoList)
                .fail(deleteFailed);

            function deleteFailed() {
                showToDoList(todoList); // re-show the restored list
            }
        };

    datacontext.getToDoLists(todoLists, error); // load ToDoLists

    return {
        todoLists: todoLists,
        error: error,
        addToDoList: addToDoList,
        deleteToDoList: deleteToDoList
    };

})(ko, todoApp.datacontext);

// Initiate the Knockout bindings
ko.applyBindings(window.todoApp.todoListViewModel);
