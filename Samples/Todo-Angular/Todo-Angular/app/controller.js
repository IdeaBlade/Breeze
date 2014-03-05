/* TodoCtrl - the controller for the "todo view" 
 * relies on Angular injector to provide:
 *     $q - promises manager
 *     $scope - context variable for the view to which the view binds
 *     $timeout - Angular equivalent of 'setTimeout'
 *     dataservice - the application data access service
 *     logger - the application's logging facility
 */
(function() {

    angular.module('app').controller('TodoCtrl',
    ['$q', '$scope', '$timeout', 'dataservice', 'logger', controller]);

    function controller($q, $scope, $timeout, dataservice, logger) {

        var editTodo = null; // the Todo being editted at the moment
        var suspendSave = false;

        // The controller's API to which the view binds
        $scope.addItem = addItem;
        $scope.archiveCompletedItems = archiveCompletedItems;
        $scope.archiveCompletedMessage = archiveCompletedMessage;
        $scope.deleteItem = deleteItem;
        $scope.editBegin = editBegin;
        $scope.editEnd = editEnd;
        $scope.getTodos = getTodos;
        $scope.includeArchived = false;
        $scope.isEditing = isEditing;
        $scope.itemFilter = itemFilter;
        $scope.itemFilterText = "";
        $scope.items = [];
        $scope.itemsLeftMessage = itemsLeftMessage;
        $scope.newTodo = "";
        $scope.purge = purge;
        $scope.reset = reset;
        $scope.toggleCompleted = toggleCompleted;

        // Start getting all the todos as soon as this controller is created
        getTodos();
        dataservice.addPropertyChangeHandler(propertyChanged);

        /* Implementation */
        function addItem() {
            var description = $scope.newTodo.trim();
            if (!description) { return; }

            // Description provided
            var item = dataservice.createTodo({
                Description: description,
                CreatedAt: new Date()
            });

            save(true).catch(addFailed);
            $scope.items.push(item);
            $scope.newTodo = "";

            function addFailed() {
                removeItem(item); // remove the added item
            }

        };

        function archiveCompletedItems() {
            suspendSave = true;
            var state = getStateOfItems();
            state.itemsDone.forEach(function(item) {
                item.IsArchived = true;
            });
            suspendSave = false;
            save(true).then(filterArchived);

            function filterArchived() {
                if (!$scope.includeArchived) {
                    $scope.items = $scope.items.filter(function(item) {
                        return !item.IsArchived;
                    });
                }
            }
        }

        function archiveCompletedMessage() {
            var count = getStateOfItems().itemsDoneCount;
            if (count > 0) {
                return "Archive " + count + " completed item" + (count > 1 ? "s" : "");
            }
            return null;
        };

        function deleteItem(item) {
            removeItem(item);
            dataservice.deleteTodo(item);
            save(true);
        };

        function editBegin(todoItem) {
            editEnd();
            editTodo = todoItem;
        };

        function editEnd() {
            if (editTodo) {
                editTodo = null;
                save();
            }
        };

        function getTodos() {
            editEnd();
            // wait for 'includeArchived' binding, then proceed
            $timeout(getTodosImpl, 0);

            function getTodosImpl() {
                dataservice.getTodos($scope.includeArchived)
                    .then(querySucceeded);
            }

            function querySucceeded(data) {
                $scope.items = data.results;
                logger.info("Fetched Todos " +
                ($scope.includeArchived ? "including archived" : "excluding archived"));
            }
        };

        function getStateOfItems() {
            var itemsDone = [], itemsLeft = [];

            $scope.items.forEach(function (item) {
                if (!item.IsArchived) { // only consider the unarchived done items  
                    if (item.IsDone) {
                        itemsDone.push(item);
                    } else {
                        itemsLeft.push(item); 
                    }
                }
            });

            $scope.allCompleted = itemsLeft.length === 0 && itemsDone.length > 0;

            return {
                itemsDone: itemsDone,
                itemsDoneCount: itemsDone.length,
                itemsLeft: itemsLeft,
                itemsLeftCount: itemsLeft.length
            };
        }

        function isEditing(todoItem) {
            return editTodo === todoItem; // are we editing this one?
        }

        function itemFilter(todoItem) {
            // Beware: this is called a lot!
            var itemFilterText = $scope.itemFilterText;
            return itemFilterText ?
                // if there is search text, look for it in the description; else return true
                -1 != todoItem.Description.toLowerCase().indexOf(itemFilterText.toLowerCase()) :
                true;
        };

        function itemsLeftMessage() {
            var count = getStateOfItems().itemsLeftCount;
            if (count > 0) {
                return count + " item" + (count > 1 ? "s" : "") + " left";
            }
            return null;
        };

        function markAllCompleted(value) {
            suspendSave = true;
            $scope.items.forEach(function (item) {
                // only set isDone for unarchived items
                !item.IsArchived && (item.IsDone = value);
            });
            suspendSave = false;
            save(true);
        };

        function propertyChanged() {
            save();
        }

        function purge() {
            return dataservice.purge($scope.getTodos);
        };

        function removeItem(item) {
            // remove the item from the list of presented items
            // N.B.: not a delete; it may still exist in cache and the db
            $scope.items = $scope.items.filter(function (i) {
                return i !== item; 
            });
        }

        function reset() {
            return dataservice.reset($scope.getTodos);
        };

        function save(force) {
            // Save if have changes to save AND
            // if must save OR (save not suspended AND not editing a Todo)
            if (dataservice.hasChanges() && 
                (force || (!suspendSave && !editTodo))) {
                    return dataservice.saveChanges();
            }
            // Decided not to save; return resolved promise w/ no result
            return $q.resolve(false); 
        }

        function toggleCompleted() {
            // Should toggle to opposite of current 'allCompleted' state
            // Assume that 'allCompleted' databinding hasn't happened yet.
            var toggleValue = !$scope.allCompleted;
            markAllCompleted(toggleValue);
        };

    }

})();