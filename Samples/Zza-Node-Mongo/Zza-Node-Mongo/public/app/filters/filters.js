(function() {
    'use strict';
    
    /** 
     Turn identifiers 'somethingLikeThis' into a title "Something Like This'
     Example in Zza: orderItem.html uses it to build tab headers from 
     product option types (e.g., 'saladDressing' -> 'Salad Dressing')
    **/
    angular.module('app').filter('toTitle', function () {
        return function (text) {
            // space before leading caps & uppercase the 1st character
            // runs of caps are their own word, e.g., 'anHTMLstring' -> 'An HTML String'
            return text ?
                   text.replace(/([A-Z]*[^A-Z]*)/g, ' $1')
                       .replace(/([A-Z]{2,})/g, '$1 ')
                       .trim()
                       .replace(/^\w/, function (c) { return c.toUpperCase(); })
                   : "";
        };
    });
    
})();