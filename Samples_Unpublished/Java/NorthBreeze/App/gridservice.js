'use strict';

(function() {
	angular.module('app').factory('gridservice', function() {
		return {
			getPagedGrid: getPagedGrid
		}
		
		function getPagedGrid($scope, gridName, dataName, columnDefs, queryFunction) {
//		    var gridName = 'customerGrid';
//		    var dataName = 'customers';
//		    var columnDefs = [{ field: 'companyName', displayName: 'Company Name', width: '50%' },
//		 	                 { field: 'contactName', displayName: 'Contact Name', width: '30%' },
//		 	                 { field: 'country', displayName: 'Country', width: '20%' }]
//		    var queryFunction = dataservice.getCustomerPage;
		    
		    var totalPath = gridName + '.totalServerItems';
		    var pagingPath = gridName + '.pagingOptions';
		    var filterPath = gridName + '.filterOptions';
		    
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
		    $scope[gridName] = {
		        data: dataName,
		        columnDefs: columnDefs,
		        enablePaging: true,
		        showFooter: true,
		        footerRowHeight: 45,
		        useExternalSorting: true,
		        multiSelect: false,
		        totalServerItems: totalPath,
		        pagingOptions: pagingOptions,
		        filterOptions: filterOptions,
		        afterSelectionChange: afterSelectionChange
		    };

		    var getPagedDataAsync = function (pageSize, page, searchText) {
		        var skip = (page - 1) * pageSize;
		        var take = pageSize * 1;
		        queryFunction(skip, take, searchText)
		            .then(gridQuerySucceeded)
		            .fail(queryFailed);
		    };

		    getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage);

		    $scope.$watch(pagingPath, function (newVal, oldVal) {
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

		    $scope.$watch(filterPath, function (newVal, oldVal) {
		        if (newVal !== oldVal) {
		            getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage, filterOptions.filterText);
		        }
		    }, true);


		    //#region private functions
		    function gridQuerySucceeded(data) {
		        $scope[dataName] = data.results;
		        if (data.inlineCount) {
		            $scope[gridName].totalServerItems = data.inlineCount;
		        }
		        $scope.$apply();
		        logger.info("Fetched " + data.results.length + " into grid");
		    }

		    function queryFailed(error) {
		        logger.error(error.message, "Query failed");
		    }
		    
			
		}
		
	});	
})();
