'use strict';

(function() {
	angular.module('app').factory('gridservice', ['labelizeFilter', 'zEditableFilter', function(labelize, editable) {
		return {
			buildPagedGrid: buildPagedGrid,
			buildColumnDefs: buildColumnDefs,
		}
		
		/**
		 * Builds a paged grid structure for ngGrid.  See http://angular-ui.github.io/ng-grid/
		 * @param scope - scope in which the grid should be created.
		 * @param config - configuration object:
		 * @param config.gridName - name of the scope property for the grid object.  Default is 'entityGrid'.
		 * @param config.dataName - name of the scope property for the grid data array.  Default is 'entities'.
		 * @param config.columnDefs - definitions of the grid columns. Default is to call buildColumnDefs() using the first entity returned
		 *  from the first query executed
		 * @param config.queryFunction - function(skip, take) to use for querying a page of data from the server. Required.  Example:
				function (skip, take) {
			        var query = breeze.EntityQuery.from('Customers').skip(skip).take(take).inlineCount(true);
			        return manager.executeQuery(query);
			    }		
		 * @param config.selectionFunction - function(rowitem, event) executed when the selected row changes.  Default is:
				function (rowitem, event) {
			        scope.entity = rowitem.entity;
			    }		  
		 */
		function buildPagedGrid(scope, config) {
			
			var gridName = config.gridName || 'entityGrid';
			var dataName = config.dataName || 'entities';
			var columnDefs = config.columnDefs || 'columnDefs';
			var queryFunction = config.queryFunction;
			var selectionFunction = config.selectionFunction || function (rowitem, event) {
			        scope.entity = rowitem.entity;
			    };	
		    
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

		    // Configure the grid.  See http://angular-ui.github.io/ng-grid/
		    scope[gridName] = {
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
		        afterSelectionChange: selectionFunction
		    };

		    // function to get a page of data.  Converts pageSize and page number into skip and take.
		    var getPagedDataAsync = function (pageSize, page, searchText) {
		        var skip = (page - 1) * pageSize;
		        var take = pageSize * 1;
		        queryFunction(skip, take, searchText)
		            .then(gridQuerySucceeded)
		            .fail(queryFailed);
		    };

		    // load the first page
		    getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage);

		    // each time the page size or page number changes, query again
		    scope.$watch(pagingPath, function (newVal, oldVal) {
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

		    // each time the filter changes, query again
		    scope.$watch(filterPath, function (newVal, oldVal) {
		        if (newVal !== oldVal) {
		            getPagedDataAsync(pagingOptions.pageSize, pagingOptions.currentPage, filterOptions.filterText);
		        }
		    }, true);


		    //#region private functions
		    
		    // refresh the data in the scope with the query results
		    function gridQuerySucceeded(data) {
		        scope[dataName] = data.results;
		        if (data.inlineCount) {
		            scope[gridName].totalServerItems = data.inlineCount;
		        }
		        if (columnDefs === 'columnDefs' && !scope.columnDefs) {
		        	scope.columnDefs = buildColumnDefsFromData(data.results);
		        }
		        scope.$apply();
		        logger.info("Fetched " + data.results.length + " into grid");
		    }

		    // log when a query fails
		    function queryFailed(error) {
		        logger.error(error.message, "Query failed");
		    }
		    
		    // build the grid column definitions, if they were not specified.
		    function buildColumnDefsFromData(results) {
		    	if (!(results && results.length)) {
		    		return;
		    	}
		    	var entity = results[0];
		    	var props = editable(entity.entityType.dataProperties);
		    	var columnDefs = buildColumnDefs(props);
		    	return columnDefs;
		    }
			
		}
		
		/**
		 * Build an array of ngGrid column definitions from Breeze DataProperties.
		 * @param properties {DataProperty[]} - DataProperties to be converted
		 * @see https://github.com/angular-ui/ng-grid/wiki/Defining-columns
		 * @see http://www.breezejs.com/sites/all/apidocs/classes/DataProperty.html
		 * @return a new array populated with the column definitions, e.g.:
		 * [{ field: 'companyName', displayName: 'Company Name', width: '50%' },
		 *  { field: 'contactName', displayName: 'Contact Name', width: '30%' }, ...] 
		 */
		function buildColumnDefs(properties) {
			var result = [];
			if (!properties || !properties.length) {
				return result;
			}
			
			var len=properties.length;
			var fieldLen, max, totalLen = 0;
			var fieldLengths = [];
			var p, def;
			
			// collect the total width of the fields, so we can later compute the percentages.
			// Do not use the 'auto' field width, because it doesn't work and is very slow.
			for (var i=0; i < len; i++) {
				p = properties[i];
				max = p.maxLength;
				// default length is 20, max is 80
				fieldLen = max ? (max > 80 ? 80 : max) : 20;
				if (p.dataType.isNumeric) {
					fieldLen = 20;
				}
				fieldLengths[i] = fieldLen;
				totalLen += fieldLen;
			}

			var dataType;
			for (var i=0; i < len; i++) {
				p = properties[i];
				// create the column definition
				def = {
						field: p.name,
						displayName: labelize(p.name),
						width: (fieldLengths[i] * 100 / totalLen) + '%'
				};
				
				dataType = p.dataType;
				// add angular filters for formatting
				if (dataType.isDate) {
					def.cellFilter = "date:'shortDate'";
				} else if (dataType.isNumeric) {
					if (dataType.isInteger) {
						def.cellFilter = 'number:0';
					} else if (dataType.name == 'Decimal') {
						def.cellFilter = 'currency';
					} else {
						def.cellFilter = 'number:4';
					}
				}
				result[i] = def;
			}
			return result;
		}
		
	}]);	
})();
