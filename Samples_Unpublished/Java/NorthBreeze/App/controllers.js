'use strict';

(function(){
	var app = angular.module('app');

	// RouteCtrl - expose app.routes and the current route for the navbar
	app.controller('RouteCtrl', function ($scope, $route) {
	        $scope.$route = $route;
	        $scope.links = app.routes;
	});

	// HomeCtrl - expose the changed entities in the EntityManager
	app.controller('HomeCtrl', ['$scope', 'dataservice', 'logger', function ($scope, dataservice, logger) {

	    $scope.reset = function () {
	        dataservice.rejectChanges();
	    }

	    $scope.update = function () {
	        dataservice.saveChanges();
	    }

	    // expose all the changed entities from the entityManager
	    $scope.changedEntities = dataservice.getChanges();
	    dataservice.subscribeChanges(function (changeargs) {
	        $scope.changedEntities = dataservice.getChanges();
	    });

	}]);

	// CustomerCtrl - load the customers and configure the grid to display them
	app.controller('CustomerCtrl', ['$scope', '$modal', 'dataservice', 'logger', function ($scope, $modal, dataservice, logger) {

	    var columnDefs = [{ field: 'companyName', displayName: 'Company Name', width: '50%' },
	                 { field: 'contactName', displayName: 'Contact Name', width: '30%' },
	                 { field: 'country', displayName: 'Country', width: '20%' }]

	    $scope.customers = $scope.customers || [];


	    $scope.popup = function() {
	    	var modalInstance = $modal.open({
	    		templateUrl: 'App/views/customer.html',
	    		scope: $scope,
	    		backdrop: 'static'
	    	})

	    	modalInstance.result.then(function(customer) {
	    		//nothing
	    	}, function(customer) {
	    		customer.entityAspect.rejectChanges();
	    	})
	    }

	    $scope.reset = function (customer) {
	        customer.entityAspect.rejectChanges();
	    }

	    $scope.update = function (customer) {
	        dataservice.saveChanges([customer]);
	    }

	    // Grid stuff
	    var filterOptions = {
	        filterText: "",
	        useExternalFilter: true
	    };

	    var pagingOptions = {
	        pageSizes: [10, 20, 50],
	        pageSize: 10,
	        totalServerItems: 0,
	        currentPage: 1
	    };

	    var afterSelectionChange = function (rowitem, event) {
	        $scope.customer = rowitem.entity;
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
	        pagingOptions: pagingOptions,
	        filterOptions: filterOptions,
	        afterSelectionChange: afterSelectionChange
	    };

	    var getPagedDataAsync = function (pageSize, page, searchText) {
	        var skip = (page - 1) * pageSize;
	        var take = pageSize * 1;
	        dataservice.getCustomerPage(skip, take, searchText)
	            .then(customersQuerySucceeded)
	            .fail(queryFailed);
	    };

	    getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage);

	    $scope.$watch('customerGrid.pagingOptions', function (newVal, oldVal) {
	        if (newVal !== oldVal) {
	            if (newVal.pageSize !== oldVal.pageSize) {
	                pagingOptions.currentPage = 1;
	                getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage, filterOptions.filterText);
	            } else {
	                if (newVal.currentPage !== oldVal.currentPage) {
	                    getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage, filterOptions.filterText);
	                }
	            }
	        }
	    }, true);

	    $scope.$watch('customerGrid.filterOptions', function (newVal, oldVal) {
	        if (newVal !== oldVal) {
	            getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage, filterOptions.filterText);
	        }
	    }, true);


	    //#region private functions
	    function customersQuerySucceeded(data) {
	        $scope.customers = data.results;
	        if (data.inlineCount) {
	            $scope.totalServerItems = data.inlineCount;
	        }
	        $scope.$apply();
	        logger.info("Fetched " + data.results.length + " Customers ");
	    }

	    function queryFailed(error) {
	        logger.error(error.message, "Query failed");
	    }

	}]);

	app.controller('OrderCtrl', ['$scope', 'dataservice', 'logger', function ($scope, dataservice, logger) {

	    $scope.orders = $scope.orders || [];

	    dataservice.getOrders()
	        .then(querySucceeded)
	        .fail(queryFailed);

	    //#region private functions
	    function querySucceeded(data) {
	        $scope.orders = data.results;
	        $scope.$apply();
	        logger.info("Fetched " + data.results.length + " Orders ");
	    }

	    function queryFailed(error) {
	        logger.error(error.message, "Query failed");
	    }


	}]);

})();
