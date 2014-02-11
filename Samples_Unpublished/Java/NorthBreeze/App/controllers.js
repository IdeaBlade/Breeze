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
	app.controller('CustomerCtrl', ['$scope', '$modal', 'dataservice', 'gridservice', 'logger', function ($scope, $modal, dataservice, gridservice, logger) {

	    $scope.customers = $scope.customers || [];

	    $scope.reset = function (customer) {
	        customer.entityAspect.rejectChanges();
	    };

	    $scope.update = function (customer) {
	        dataservice.saveChanges([customer]);
	    };

	    // Grid stuff
	    var columnDefs = [{ field: 'companyName', displayName: 'Company Name', width: '50%' },
	 	                 { field: 'contactName', displayName: 'Contact Name', width: '30%' },
	 	                 { field: 'country', displayName: 'Country', width: '20%' }];

	    var selectionFunction = function (rowitem, event) {
	        $scope.customer = rowitem.entity;
	    };
	    
	    var gridConfig = {
	    		gridName: 'customerGrid',
	    		dataName: 'customers',
	    		columnDefs: columnDefs,
	    		queryFunction: dataservice.getCustomerPage,
	    		selectionFunction: selectionFunction
	    };
	    
	    gridservice.buildPagedGrid($scope, gridConfig);

	}]);

	app.controller('OrderCtrl', ['$scope', '$modal', 'dataservice', 'gridservice', 'logger', 
	    function ($scope, $modal, dataservice, gridservice, logger) {

	    var columnDefs = [{ field: 'customer.companyName', displayName: 'Customer', width: '12%' },
	                      { field: 'employee.fullName', displayName: 'Employee', width: '12%' },
	                      { field: 'orderDate', displayName: 'Order Date', width: '5%', cellFilter: "date:'shortDate'"},
	                      { field: 'requiredDate', displayName: 'Required Date', width: '5%', cellFilter: "date:'shortDate'"},
	                      { field: 'shippedDate', displayName: 'Shipped Date', width: '5%', cellFilter: "date:'shortDate'"},
	                      { field: 'freight', displayName: 'Freight', width: '5%', cellFilter: 'currency'},
	                      { field: 'shipName', displayName: 'Ship Name', width: '12%'},
	                      { field: 'shipAddress', displayName: 'Ship Address', width: '12%'},
	                      { field: 'shipCity', displayName: 'Ship City', width: '12%'},
	                      { field: 'shipRegion', displayName: 'Region', width: '5%'},
	                      { field: 'shipPostalCode', displayName: 'Post Code', width: '5%'},
	                      { field: 'shipCountry', displayName: 'Country', width: '10%'}];
	    
	    var gridConfig = {
	    		columnDefs: columnDefs,
	    		queryFunction: dataservice.getOrderPage
	    };
	    
	    gridservice.buildPagedGrid($scope, gridConfig);

	    $scope.popup = function() {
	    	var modalInstance = $modal.open({
	    		templateUrl: 'App/views/entityEdit.html',
	    		scope: $scope,
	    		backdrop: 'static'
	    	});

	    	modalInstance.result.then(function(customer) {
	    		//nothing
	    	}, function(entity) {
	    		entity.entityAspect.rejectChanges();
	    	});
	    };

	    
	}]);

})();
