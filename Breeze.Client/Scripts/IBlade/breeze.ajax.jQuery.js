// needs JQuery
(function(factory) {
    // Module systems magic dance.

    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"), exports);
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze", "exports"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }
}(function(breeze, exports) {

    var impl = { };

    // -------------------------------------------
    var jQuery;

    impl.name = "jQuery";

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

    breeze.core.config.registerInterface("ajax", impl);


}));
