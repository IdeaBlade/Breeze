'use strict';

/* Controllers */
app.controller('RouteCtrl', function ($scope, $route) {
        $scope.$route = $route;
        $scope.links = app.routes;
});


app.controller('HomeCtrl', [function () {

}]);

app.controller('CustomerCtrl', ['$scope', function ($scope) {

    var columnDefs = [{ field: '_backingStore.CompanyName', displayName: 'Company Name', width: 'auto' },
                 { field: '_backingStore.ContactName', displayName: 'Contact Name', width: 'auto' },
                 { field: '_backingStore.Country', displayName: 'Country', width: 'auto' }]

    $scope.customers = $scope.customers || [];
    $scope.customerGrid = { data: 'customers', columnDefs: columnDefs, enableCellEdit: true };

    /*
Address: "24, place Kléber"
City: "Strasbourg"
CompanyName: "Blondesddsl père et fils"
ContactName: "Frédérique Citeaux"
ContactTitle: "Marketing Manager"
Country: "France"
CustomerID: "2477d007-f7f5-487e-945a-3dd466581813"
CustomerID_OLD: "BLONP"
Fax: "88.60.15.32"
Orders: Array[0]
Phone: "88.60.15.31"
PostalCode: "67000"
Region: null
RowVersion: 0    */

    var getAllCustomers = function () {
        app.dataservice.getAllCustomers()
            .then(customersQuerySucceeded)
            .fail(queryFailed);
    };

    getAllCustomers();

    //#region private functions
    function customersQuerySucceeded(data) {
        $scope.customers = data.results;
        $scope.$apply();
        app.logger.info("Fetched " + data.results.length + " Customers ");
        $scope.customerGrid = { data: 'customers' };
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
