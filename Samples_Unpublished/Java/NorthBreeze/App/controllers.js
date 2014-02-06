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
	    var columnDefs = [{ field: 'companyName', displayName: 'Company Name', width: '50%' },
	 	                 { field: 'contactName', displayName: 'Contact Name', width: '30%' },
	 	                 { field: 'country', displayName: 'Country', width: '20%' }]

	    gridservice.getPagedGrid($scope, 'customerGrid', 'customers', columnDefs, dataservice.getCustomerPage);

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
