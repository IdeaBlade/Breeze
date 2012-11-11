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
    var core = breeze.core;
    
    var jQuery;
    
    var ctor = function() {
        this.defaultSettings = { };
    };

    ctor.prototype.name = "jQuery";

    ctor.prototype.initialize = function() {
        jQuery = window.jQuery;
        if ((!jQuery) && require) {
            jQuery = require("jQuery");
        }
        if (!jQuery) {
            throw new Error("The Breeze 'ajax_jQuery' pluggin needs jQuery and was unable to find it.");
        }

    };

    ctor.prototype.ajax = function (settings) {
        if (!core.isEmpty(this.defaultSettings)) {
            var compositeSettings = core.extend({}, this.defaultSettings);
            core.extend(compositeSettings, settings);
            jQuery.ajax(compositeSettings);
        } else {
            jQuery.ajax(settings);
        }
    };

    
    // last param is true because for now we only have one impl.
    breeze.core.config.registerInterface("ajax", ctor, true);
    
}));
