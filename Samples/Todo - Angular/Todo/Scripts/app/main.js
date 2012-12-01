
var todoMain = angular.module('todoMain', [])
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

   

todoMain.controller('shellVm', function ($scope) {

    var removeItem = breeze.core.arrayRemoveItem;
    var dataservice = app.dataservice;
    var logger = app.logger;
    var suspendItemSave;

    $scope.newTodo = "";
    $scope.items = [];
    $scope.includeArchived = false;
    
    $scope.addItem = function() {
        var item = dataservice.createTodo();

        item.IsDone = this.allCompleted;
        item.Description = this.newTodo;
        item.CreatedAt = new Date();

        if (item.entityAspect.validateEntity()) {
            extendItem(item);
            this.items.push(item);
            dataservice.saveChanges();
            this.newTodo = "";
        } else {
            handleItemErrors(item);
        }
    };
    
    $scope.edit = function(item) {
        if (item) {
            item.isEditing = true;
        }
    };

    $scope.debug = function (item) {
        var z = item.IsDone;
    };
    
    $scope.completeEdit = function(item) {
        if (item) {
            item.isEditing = false;
            dataservice.saveChanges(true);
        }
    };
    
    $scope.removeItem = function(item) {
        removeItem(this.items, item);
        item.entityAspect.setDeleted();
        dataservice.saveChanges();
    };

    $scope.archiveCompletedItems = function() {
        var state = getStateOfItems();
        suspendItemSave = true;
        state.itemsDone.forEach(function(item) {
            if (!this.includeArchived) {
                removeItem(this.items, item);
            }
            item.IsArchived = true;
        }, this);
        suspendItemSave = false;
        dataservice.saveChanges();
    };
    
    $scope.purge = function() {
        return dataservice.purge(this.getAllTodos);
    };

    $scope.reset = function() {
        return dataservice.reset(this.getAllTodos);
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
        this.markAllCompleted(this.allCompleted);
    };

    $scope.markAllCompleted = function(value) {
        suspendItemSave = true;
        this.items.forEach(function(item) {
            item.IsDone = value;
        });
        suspendItemSave = false;
        dataservice.saveChanges();
    };

    $scope.areAllCompleted = function() {
        var state = getStateOfItems();
        return state.itemsLeftCount === 0 && this.items.length > 0;
    };


    $scope.getAllTodos = function() {
        dataservice.getAllTodos($scope.includeArchived)
            .then(querySucceeded)
            .fail(queryFailed);
    };

    $scope.getAllTodos();

    function querySucceeded(data) {
        $scope.items = [];
        data.results.forEach(function (item) {
            extendItem(item);
            $scope.items.push(item);
        });
        $scope.allCompleted = $scope.areAllCompleted();
        $scope.$apply();
        
        logger.info("Fetched Todos " +
            ($scope.includeArchived ? "including archived" : "excluding archived"));
    }

    function queryFailed(error) {
        logger.error(error, "Query failed");
    }

    function extendItem(item) {
        if (item.isEditing !== undefined) return; // already extended

        item.isEditing = false;

        // listen for changes with Breeze PropertyChanged event
        item.entityAspect.propertyChanged.subscribe(function () {
            if (item.isEditing) return;
            if (item.propertyChangedPending || suspendItemSave) { return; }
            // throttle property changed response
            // allow time for other property changes (if any) to come through
            
            item.propertyChangedPending = true;
            setTimeout(function () {
                if (item.entityAspect.validateEntity()) {
                    if (item.entityAspect.entityState.isModified()) {
                        dataservice.saveChanges();
                    }
                } else { // errors
                    handleItemErrors(item);
                    item.isEditing = true; // go back to editing
                }
                item.propertyChangedPending = false;
            }, 10);

        });
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

        return {
            itemsDone: itemsDone,
            itemsDoneCount: itemsDone.length,
            itemsLeft: itemsLeft,
            itemsLeftCount: itemsLeft.length
        };
    }

});

