// needs JQuery
(function(factory) {
    // Module systems magic dance.
    if (breeze) {
        factory(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    }
}(function(breeze) {
    var core = breeze.core;
    
    var jQuery;
    
    var ctor = function () {
        this.name = "jQuery";
        this.defaultSettings = { };
    };

    ctor.prototype.initialize = function () {
        // jQuery = core.requireLib("jQuery", "needed for 'ajax_jQuery' pluggin", true);
        // for the time being don't fail if not found
        jQuery = core.requireLib("jQuery");
    };

    ctor.prototype.ajax = function (config) {
        if (!jQuery) {
            throw new Error("Unable to locate jQuery");
        }
        var jqConfig = {
            type: config.type, 
            url: config.url,
            data: config.params || config.data,
            dataType: config.dataType,
            contentType: config.contentType,
            crossDomain: config.crossDomain
        }
        
        if (!core.isEmpty(this.defaultSettings)) {
            var compositeConfig = core.extend({}, this.defaultSettings);
            jqConfig = core.extend(compositeConfig, jqConfig);
        }
        
        jqConfig.success = function (data, textStatus, XHR) {
            var httpResponse = {
                data: data,
                status: XHR.status,
                getHeaders: getHeadersFn(XHR),
                config: config
            };
            config.success(httpResponse);
            XHR.onreadystatechange = null;
            XHR.abort = null;
        };
        jqConfig.error = function (XHR, textStatus, errorThrown) {
            var httpResponse = {
                data: XHR.responseText,
                status: XHR.status,
                getHeaders: getHeadersFn(XHR),
                error: errorThrown,
                config: config
            };
            config.error(httpResponse);
            XHR.onreadystatechange = null;
            XHR.abort = null;
        };
        jQuery.ajax(jqConfig);

    };

    
    function getHeadersFn(XHR) {
        return function (headerName) {
            if (headerName && headerName.length > 0) {
                return XHR.getResponseHeader(headerName);
            } else {
                return XHR.getAllResponseHeaders();
            };
        };
    }
    

    breeze.config.registerAdapter("ajax", ctor);
    
}));
