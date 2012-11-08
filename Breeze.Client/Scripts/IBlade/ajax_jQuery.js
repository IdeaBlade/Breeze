// needs JQuery

define(["core"],
function (core) {

    var impl = {};

    // -------------------------------------------
    var jQuery;
    
    impl.initialize = function() {
        jQuery = window.jQuery;
        if ((!jQuery) && require) {
            jQuery = require("jQuery");
        }
        if (!jQuery) {
            throw new Error("The Breeze 'ajax_jQuery' pluggin needs jQuery and was unable to find it.");
        }
        
    };

    impl.ajax = function(settings) {
        jQuery.ajax(settings);
    };

    return impl;


});
