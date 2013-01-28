

app.gridExample = angular.module('GridExample', ['ngGrid'])
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
 

app.gridExample.factory('actionContext', function () {
    return { };
});



app.gridExample.controller('customerController', function($scope, actionContext) {
    
    var removeItem = breeze.core.arrayRemoveItem;
    var dataservice = window.app.dataservice;
    var logger = window.app.logger;

    $scope.customers = [];
    $scope.columnDefs = [
            { field: 'CompanyName', displayName: 'Company Name' },
            { field: 'City' }];
    
    $scope.gridOptions = { data: 'customers', columnDefs: 'columnDefs', afterSelectionChange: afterSelectionChange };
    
    $scope.addCompany = function() {
        var item = dataservice.createCompany();
        if (item.entityAspect.validateEntity()) {
            $scope.customers.push(item);
            // dataservice.saveChanges();
        } else {
            handleItemErrors(item);
        }
    };

    $scope.getAllCustomers = function () {
        dataservice.getAllCustomers()
            .then(customersQuerySucceeded)
            .fail(queryFailed);
    };

    $scope.getAllCustomers();

    //#region private functions
    function customersQuerySucceeded(data) {
        $scope.customers = data.results;       
        $scope.$apply();
        logger.info("Fetched " + data.results.length + " Customers ");
    }
    
    function afterSelectionChange(rowItem, event) {
        actionContext.currentCustomer = this.entity;
        dataservice.getOrders(this.entity)
            .then(ordersQuerySucceeded)
            .fail(queryFailed)
    }
    
    function ordersQuerySucceeded(data) {
        actionContext.orderScope.orders = data.results;
        actionContext.orderScope.$apply();
        logger.info("Fetched " + data.results.length + " Orders ");
    }


    function queryFailed(error) {
        logger.error(error.message, "Query failed");
    }
    
    //function validateAndSaveModifiedItem(item) {
    //    if (item.entityAspect.entityState.isModified()) {
    //        if (item.entityAspect.validateEntity()) {
    //            dataservice.saveChanges();
    //        } else { // errors
    //            handleItemErrors(item);
    //            item.isEditing = true; // go back to editing
    //        }
    //    }
    //    item.propertyChangedPending = false;
    //}
    
    function handleItemErrors(item) {
        if (!item) { return; }
        var errs = item.entityAspect.getValidationErrors();
        if (errs.length === 0) {
            logger.info("No errors for current item");
            return;
        }
        var firstErr = item.entityAspect.getValidationErrors()[0];
        logger.error(firstErr.errorMessage);
        item.entityAspect.rejectChanges(); // harsh for demo 
    }


    
});

app.gridExample.controller('orderController', function ($scope, actionContext) {

    actionContext.orderScope = $scope;
    
    $scope.orders = [];
    $scope.columnDefs = [
        { field: 'OrderID', displayName: 'Order ID' },
        { field: 'OrderDate', displayName: "Date Ordered" },
        { field: 'ShippedDate', displayName: "Date Shipped" },
        { field: 'Freight', displayName: "Freight Cost" }
        ];

    $scope.gridOptions = { data: 'orders', columnDefs: 'columnDefs' };



    
});