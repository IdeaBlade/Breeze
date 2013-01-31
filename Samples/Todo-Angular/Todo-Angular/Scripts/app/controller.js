
app.todoMain = angular.module('TodoMain', [])
    .directive('onFocus', function() {
        return {
            restrict: 'A',
            link: function(scope, elm, attrs) {
                elm.bind('focus', function() {
                    scope.$apply(attrs.onFocus);
                });
            }
        };
    })
    .directive('onBlur', function() {
        return {
            restrict: 'A',
            link: function(scope, elm, attrs) {
                elm.bind('blur', function() {
                    scope.$apply(attrs.onBlur);
                });
            }
        };
    })
    .directive('focusWhen', function () {
        return function (scope, elm, attrs) {
            scope.$watch(attrs.focusWhen, function (newVal) {
                if (newVal) {
                    setTimeout(function() {
                        elm.focus();
                    }, 10);
                } 
            });
        };
    });
 

app.todoMain.controller('TodoCtrl', function ($scope) {

    var removeItem = breeze.core.arrayRemoveItem;
    var dataservice = window.app.dataservice;
    var logger = window.app.logger;
    var suspendItemSave;

    $scope.searchText = "";
    
    // Beware: this is called a lot!
    $scope.itemFilter = function (todoItem) {
        var searchText = $scope.searchText;
        return searchText ?
            // if there is search text, look for it in the description; else return true
            -1 != todoItem.Description.toLowerCase().indexOf(searchText.toLowerCase()) :
            true;
    };

    $scope.newTodo = "";
    $scope.items = [];
    $scope.includeArchived = false;
    
    $scope.addItem = function() {
        var item = dataservice.createTodo({
            Description: $scope.newTodo,
            CreatedAt: new Date(),
            IsDone: $scope.allCompleted
        });

        if (item.entityAspect.validateEntity()) {
            extendItem(item);
            $scope.items.push(item);
            dataservice.saveChanges();
            $scope.newTodo = "";
        } else {
            handleItemErrors(item);
        }
    };
    
    $scope.edit = function(item) {
        if (item) {
            item.isEditing = true;
        }
    };

    $scope.completeEdit = function(item) {
        if (item) {
            item.isEditing = false;
            validateAndSaveModifiedItem(item);
        }
    };
    
    $scope.removeItem = function(item) {
        removeItem($scope.items, item);
        item.entityAspect.setDeleted();
        dataservice.saveChanges();
    };

    $scope.archiveCompletedItems = function() {
        var state = getStateOfItems();
        suspendItemSave = true;
        state.itemsDone.forEach(function(item) {
            if (!$scope.includeArchived) {
                removeItem($scope.items, item);
            }
            item.IsArchived = true;
        });
        suspendItemSave = false;
        dataservice.saveChanges();
    };
    
    $scope.purge = function() {
        return dataservice.purge($scope.getAllTodos);
    };

    $scope.reset = function() {
        return dataservice.reset($scope.getAllTodos);
    };

    $scope.archiveCompletedMessage = function() {
        var count = getStateOfItems().itemsDoneCount;
        if (count > 0) {
            return "Archive " + count + " completed item" + (count > 1 ? "s" : "");
        }
        return null;
    };

    $scope.itemsLeftMessage = function() {
        var count = getStateOfItems().itemsLeftCount;
        if (count > 0) {
            return count + " item" + (count > 1 ? "s" : "") + " left";
        }
        return null;
    };

    $scope.toggleCompleted = function () {
        $scope.markAllCompleted(!$scope.allCompleted);
    };

    $scope.markAllCompleted = function(value) {
        suspendItemSave = true;
        $scope.items.forEach(function(item) {
            item.IsDone = value;
        });
        suspendItemSave = false;
        dataservice.saveChanges();
    };

    $scope.getAllTodos = function () {
        dataservice.getAllTodos($scope.includeArchived)
            .then(querySucceeded)
            .fail(queryFailed);
    };

    $scope.getAllTodos();

    //#region private functions
    function querySucceeded(data) {
        $scope.items = [];
        data.results.forEach(function (item) {
            extendItem(item);
            $scope.items.push(item);
        });
        $scope.$apply();
        
        logger.info("Fetched Todos " +
            ($scope.includeArchived ? "including archived" : "excluding archived"));
    }

    function queryFailed(error) {
        logger.error(error.message, "Query failed");
    }

    function extendItem(item) {
        if (item.isEditing !== undefined) return; // already extended

        item.isEditing = false;

        // listen for changes with Breeze PropertyChanged event
        item.entityAspect.propertyChanged.subscribe(function() {
            if (item.isEditing || item.propertyChangedPending || suspendItemSave) {
                return;
            }
            // throttle property changed response to allow time
            // for other property changes (e.g. "Mark all as complete")
            item.propertyChangedPending = true;
            setTimeout(function () { validateAndSaveModifiedItem(item); }, 10);               
        });
    }
    
    function validateAndSaveModifiedItem(item) {
        if (item.entityAspect.entityState.isModified()) {
            if (item.entityAspect.validateEntity()) {
                dataservice.saveChanges();
            } else { // errors
                handleItemErrors(item);
                item.isEditing = true; // go back to editing
            }
        }
        item.propertyChangedPending = false;
    }
    
    function handleItemErrors(item) {
        if (!item) { return; }
        var errs = item.entityAspect.getValidationErrors();
        if (errs.length == 0) {
            logger.info("No errors for current item");
            return;
        }
        var firstErr = item.entityAspect.getValidationErrors()[0];
        logger.error(firstErr.errorMessage);
        item.entityAspect.rejectChanges(); // harsh for demo 
    }

    function getStateOfItems() {
        var itemsDone = [], itemsLeft = [];

        $scope.items.forEach(function (item) {
            if (item.IsDone) {
                if (!item.IsArchived) {
                    itemsDone.push(item); // only unarchived items                
                }
            } else {
                itemsLeft.push(item);
            }
        });

        $scope.allCompleted = itemsLeft.length === 0 && $scope.items.length > 0;

        return {
            itemsDone: itemsDone,
            itemsDoneCount: itemsDone.length,
            itemsLeft: itemsLeft,
            itemsLeftCount: itemsLeft.length
        };
    }
    //#endregion
});