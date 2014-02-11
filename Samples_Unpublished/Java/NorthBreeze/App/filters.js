'use strict';

(function() {
	var app = angular.module('app'); 
	app.filter('labelize', function() {
		/**
		 * converts a camelCasePropertyName into a Label Case Property Name
		 * @param string {String} property name to convert
		 */
		return function(string) {
			if (!string) {
				return string
			}
			
			return string.charAt(0).toUpperCase() + 
				string.slice(1).replace(/([a-z\d])([A-Z]+)/g, '$1 $2').replace(/[_-\s]+/g, ' '); //.toLowerCase();			
		}
	});
	
	app.filter('zEditable', function() {
		/**
		 * Filters the Breeze properties to return only the editable ones.  
		 * Excludes key properties, version properties, and non-scalar properties.
		 * @param arr {DataProperty[]} - DataProperties to be filtered
		 * @see http://www.breezejs.com/sites/all/apidocs/classes/DataProperty.html
		 * @return a new array populated with only the editable properties
		 */
		return function(properties) {
			var result = [];
			if (!properties || !properties.length) {
				return result;
			}
			var p;
			for (var i=0, len=properties.length; i < len; i++) {
				p = properties[i];
				if (!(p.isComplexProperty || p.isPartOfKey || p.relatedNavigationProperty || !p.isScalar || (p.concurrencyMode && p.concurrencyMode != 'None'))) {
					result.push(p);
				}
			}
			return result;
		}
	});
	
	app.filter('zInputType', function() {
		/**
		 * Determine the HTML input type from the data property
		 * @param prop {DataProperty} - DataProperties to be filtered
		 * @see http://www.breezejs.com/sites/all/apidocs/classes/DataProperty.html
		 * @see http://dev.w3.org/html5/markup/input.date.html
		 * @return a string representing the type 
		 */
		return function(prop) {
			if (!prop) {
				return 'text';
			}
			var dt = prop.dataType;
			if (dt.isDate) {
				return 'date';
			} else if (dt.isNumeric) {
				return 'number';
			} 
			return 'text';
		}
	});
	
})();
