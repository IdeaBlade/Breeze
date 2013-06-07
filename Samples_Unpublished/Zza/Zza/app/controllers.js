'use strict';

/* Controllers */
app.controller('RouteCtrl', function ($scope, $route) {
    $scope.$route = $route;
    $scope.links = app.routes;
});


app.controller('HomeCtrl', [function () {

}]);

app.controller('CustomerCtrl', ['$scope', function ($scope) {

    var columnDefs = [{ field: '_backingStore.CompanyName', displayName: 'Company Name', width: '50%' },
                 { field: '_backingStore.ContactName', displayName: 'Contact Name', width: '30%' },
                 { field: '_backingStore.Country', displayName: 'Country', width: '20%' }]

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

    $scope.customerGrid = {
        data: 'customers',
        columnDefs: columnDefs,
        enablePaging: true,
        showFooter: true,
        multiSelect: false,
        pagingOptions: $scope.pagingOptions,
        filterOptions: $scope.filterOptions
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
        $scope.pagingOptions.totalServerItems = data.inlineCount;
        $scope.$apply();
        app.logger.info("Fetched " + data.results.length + " Customers ");
        //$scope.customerGrid = {
        //    data: 'customers',
        //    enablePaging: true,
        //    showFooter: true,
        //    pagingOptions: $scope.pagingOptions,
        //    filterOptions: $scope.filterOptions
        //};
    }

    function queryFailed(error) {
        logger.error(error.message, "Query failed");
    }

}]);

app.controller('OrderCtrl', function ($scope) {

    var columnDefs = [{ field: 'name', displayName: 'Name' },
                 { field: 'age', displayName: 'Age' }];

    $scope.myData = [{ name: "Moroni", age: 50 },
             { name: "Tiancum", age: 43 },
             { name: "Jacob", age: 27 },
             { name: "Nephi", age: 29 },
             { name: "Enos", age: 34 }];

    $scope.gridOptions = {
        data: 'myData',
        enableCellSelection: false,
        enableCellEdit: true,
        enableRowSelection: false,
        columnDefs: columnDefs
    };


});
