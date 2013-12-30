'use strict';

// RouteCtrl - expose app.routes and the current route for the navbar
app.controller('RouteCtrl', function ($scope, $route) {
        $scope.$route = $route;
        $scope.links = app.routes;
});

// HomeCtrl - expose the changed entities in the EntityManager
app.controller('HomeCtrl', ['$scope', function ($scope) {

    $scope.reset = function () {
        app.dataservice.rejectChanges();
    }

    $scope.update = function () {
        app.dataservice.saveChanges();
    }

    // expose all the changed entities from the entityManager
    $scope.changedEntities = app.dataservice.getChanges();
    app.dataservice.subscribeChanges(function (changeargs) {
        $scope.changedEntities = app.dataservice.getChanges();
    });

}]);

// CustomerCtrl - load the customers and configure the grid to display them
app.controller('CustomerCtrl', ['$scope', function ($scope) {

    // we should *not* have to use _backingStore, but grid isn't displaying data without it.
    var columnDefs = [{ field: '_backingStore.companyName', displayName: 'Company Name', width: '50%' },
                 { field: 'contactName', displayName: 'Contact Name', width: '30%' },
                 { field: 'country', displayName: 'Country', width: '20%' }]

    $scope.customers = $scope.customers || [];

    $scope.filterOptions = {
        filterText: "",
        useExternalFilter: true
    };

    $scope.pagingOptions = {
        pageSizes: [10, 20, 50],
        pageSize: 10,
        totalServerItems: 0,
        currentPage: 1
    };

    $scope.afterSelectionChange = function (rowitem, event) {
        $scope.customer = rowitem.entity;
    }

    $scope.reset = function (customer) {
        customer.entityAspect.rejectChanges();
    }

    $scope.update = function (customer) {
        app.dataservice.saveChanges([customer]);
    }

    // Configure the grid.  See http://angular-ui.github.io/ng-grid/
    $scope.customerGrid = {
        data: 'customers',
        columnDefs: columnDefs,
        enablePaging: true,
        showFooter: true,
        footerRowHeight: 45,
        useExternalSorting: true,
        multiSelect: false,
        totalServerItems: 'totalServerItems',
        pagingOptions: $scope.pagingOptions,
        filterOptions: $scope.filterOptions,
        afterSelectionChange: $scope.afterSelectionChange
    };

    $scope.getPagedDataAsync = function (pageSize, page, searchText) {
        var skip = (page - 1) * pageSize;
        var take = pageSize * 1;
        app.dataservice.getCustomerPage(skip, take, searchText)
            .then(customersQuerySucceeded)
            .fail(queryFailed);
    };

    $scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage);

    $scope.$watch('pagingOptions', function (newVal, oldVal) {
        if (newVal !== oldVal) {
            if (newVal.pageSize !== oldVal.pageSize) {
                $scope.pagingOptions.currentPage = 1;
                $scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText);
            } else {
                if (newVal.currentPage !== oldVal.currentPage) {
                    $scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText);
                }
            }
        }
    }, true);

    $scope.$watch('filterOptions', function (newVal, oldVal) {
        if (newVal !== oldVal) {
            $scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText);
        }
    }, true);


    //#region private functions
    function customersQuerySucceeded(data) {
        $scope.customers = data.results;
        if (data.inlineCount) {
            $scope.totalServerItems = data.inlineCount;
        }
        $scope.$apply();
        app.logger.info("Fetched " + data.results.length + " Customers ");
    }

    function queryFailed(error) {
        app.logger.error(error.message, "Query failed");
    }

}]);

app.controller('OrderCtrl', function ($scope) {

    $scope.orders = $scope.orders || [];
    
    app.dataservice.getOrders()
        .then(querySucceeded)
        .fail(queryFailed);

    //#region private functions
    function querySucceeded(data) {
        $scope.orders = data.results;
        $scope.$apply();
        app.logger.info("Fetched " + data.results.length + " Orders ");
    }

    function queryFailed(error) {
        logger.error(error.message, "Query failed");
    }


});
