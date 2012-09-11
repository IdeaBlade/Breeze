define(function (require) {
    var dataservice = require('services/dataservice');
    var logger = require("logger");

    var markingAll;

    var shellVm = {
        newTodo: ko.observable(""),
        items: ko.observableArray([]),
        addItem: function () {
            var item = dataservice.createTodo();

            item.IsDone(this.markAllCompleted());
            item.Description(this.newTodo());
            item.CreatedAt(new Date());

            if (item.entityAspect.validateEntity()) {
                extendItem(item);
                this.items.push(item);
                dataservice.saveChanges();
                this.newTodo("");
            } else {
                handleTodoErrors(item);
            }
        },
        edit: function (item) {
            if (item) {
                item.isEditing(true);
            }
        },
        completeEdit: function (item) {
            if (item) {
                if (item.entityAspect.validateEntity()) {
                    item.isEditing(false);
                } else {
                    handleTodoErrors(item);
                }
            }
        },
        removeItem: function (item) {
            this.items.remove(item);
            item.entityAspect.setDeleted();
            dataservice.saveChanges();
        },
        includeArchived: ko.observable(false),
        archiveCompletedItems: function () {
            var state = getStateOfItems();
            state.itemsDone.forEach(function (item) {
                if (!shellVm.includeArchived()) {
                    this.items.remove(item);
                }
                item.IsArchived(true);
            }, this);
            dataservice.saveChanges();
        },
        purge: purge,
        reset: reset
    };

    shellVm.archiveCompletedMessage = ko.computed(function () {
        var count = getStateOfItems().itemsDoneCount;
        if (count > 0) {
            return "Archive " + count + " completed item" + (count > 1 ? "s" : "");
        }
        return null;
    }, shellVm);

    shellVm.itemsLeftMessage = ko.computed(function () {
        var count = getStateOfItems().itemsLeftCount;
        if (count > 0) {
            return count + " item" + (count > 1 ? "s" : "") + " left";
        }

        return null;
    }, shellVm);

    shellVm.markAllCompleted = ko.computed({
        read: function () {
            var state = getStateOfItems();
            return state.itemsLeftCount === 0 && shellVm.items().length > 0;
        },
        write: function (value) {
            markingAll = true;
            shellVm.items().forEach(function (item) {
                item.IsDone(value);
            });
            markingAll = false;
            dataservice.saveChanges();
        },
        owner: shellVm
    });

    shellVm.includeArchived.subscribe(getAllTodos);

    getAllTodos();

    return shellVm;

    /*** Supporting private functions ***/

    function getAllTodos() {
        dataservice.getAllTodos(shellVm.includeArchived())
            .then(processTodoQueryResults)
            .fail(handleQueryErrors);
    }

    function processTodoQueryResults(data) {
        shellVm.items([]);
        data.results.forEach(function (item) {
            extendItem(item);
            shellVm.items.push(item);
        });
        logger.info("Fetched Todos " +
            (shellVm.includeArchived() ? "including archived" : "excluding archived"));
    }

    function handleQueryErrors(error) {
        logger.error(error, "Query failed");
    }

    function extendItem(item) {
        if (item.isEditing) return; // already extended

        item.isEditing = ko.observable(false);
        item.isEditing.subscribe(function (value) {
            if (!value) {
                dataservice.saveChangesAfterDelay();
            }
            logger.info("isEditing: " + value);
        });

        item.IsDone.subscribe(function () {
            if (markingAll) {
                return; // marking a bunch of items; don't save until done
            }
            dataservice.saveChangesAfterDelay();
        });
    }
    
    function handleTodoErrors(todo) {
        if (!todo) { return; }
        var errs = todo.entityAspect.getValidationErrors();
        if (errs.length == 0) {
            logger.info("No errors for current Todo" );
            return;
        }
        var firstErr = todo.entityAspect.getValidationErrors()[0];
        logger.error(firstErr.errorMessage);
        todo.entityAspect.rejectChanges();
    }

    function getStateOfItems() {
        var itemsDone = [], itemsLeft = [];

        shellVm.items().forEach(function (item) {
            if (item.IsDone()) {
                if (!item.IsArchived()) {
                    itemsDone.push(item); // only unarchived items                
                }
            } else {
                itemsLeft.push(item);
            }
        });

        return {
            itemsDone: itemsDone,
            itemsDoneCount: itemsDone.length,
            itemsLeft: itemsLeft,
            itemsLeftCount: itemsLeft.length
        };
    }

    function purge() {
        return dataservice.purge(getAllTodos);
    }

    function reset() {
        return dataservice.reset(getAllTodos);
    }
});