'use strict';

(function() {
	angular.module('app').filter('labelize', function() {
		// converts a camelCasePropertyName into a Label Case Property Name
		return function(string) {
			if (!string) {
				return string
			}
			
			return string.charAt(0).toUpperCase() + 
				string.slice(1).replace(/([a-z\d])([A-Z]+)/g, '$1 $2').replace(/[_-\s]+/g, ' '); //.toLowerCase();			
		}
		
	});	
})();
