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
            var httpResponse;
            var xRespondedJson = XHR.getResponseHeader("X-Responded-JSON");
            if (xRespondedJson != undefined) {
                var xRespondedObj = JSON.parse(xRespondedJson);
                httpResponse = {
                    data: data,
                    status: xRespondedObj.status != undefined ? xRespondedObj.status : XHR.status,
                    getHeaders: getMergedHeadersFn(XHR, xRespondedObj.headers),
                    error: data.Message,
                    config: config
                };
            } else {
                httpResponse = {
                    data: data,
                    status: XHR.status,
                    getHeaders: getHeadersFn(XHR),
                    config: config
                };
            }
            
            if (httpResponse.status > 300) {
                config.error(httpResponse);
            } else {
                config.success(httpResponse);
            }
        
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
    
	//Returns headers from XHR object as well as headers from additional container
	//We need it cause MVC 5 now returns 'X-Responded-JSON' header containing JSON object with additional 'headers' property
    function getMergedHeadersFn(XHR, additionalHeaders) {
        if (additionalHeaders == undefined) return getHeadersFn(XHR);

        return function (headerName) {
            if (headerName && headerName.length > 0) {
                var header = XHR.getResponseHeader(headerName);
                return header != undefined ? header : additionalHeaders[headerName];
            } else {
                var headers = XHR.getAllResponseHeaders();
                for (var propname in additionalHeaders) {
                    headers = headers + '\n\r' + propname + ': ' + additionalHeaders[propname];
                }
                return headers;
            };
        };
    }

    breeze.config.registerAdapter("ajax", ctor);
    
}));
