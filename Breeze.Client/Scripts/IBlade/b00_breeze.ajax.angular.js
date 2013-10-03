// needs Angular
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
    
    var httpService;

    var ctor = function () {
        this.name = "angular";
        this.defaultSettings = { };
    };

    ctor.prototype.initialize = function () {

        var ng = core.requireLib("angular");
        if (ng) {
            var $injector = ng.injector(['ng']);
            $injector.invoke(function ($http) {
                httpService = $http;
            });
        }
                
    };

    ctor.prototype.ajax = function (config) {
        if (!httpService) {
            throw new Error("Unable to locate angular for ajax adapter");
        }
        var ngConfig = {
            method: config.type,
            url: config.url,
            dataType: config.dataType,
            contentType: config.contentType,
            crossDomain: config.crossDomain
        }

        if (config.params) {
            // Hack: because of the way that Angular handles writing parameters out to the url.
            // so this approach takes over the url param writing completely.
            // See: http://victorblog.com/2012/12/20/make-angularjs-http-service-behave-like-jquery-ajax/
            var delim = (ngConfig.url.indexOf("?") >= 0) ? "&" : "?";
            ngConfig.url = ngConfig.url + delim + encodeParams(config.params);
        }

        if (config.data) {
            ngConfig.data = config.data;
        }
        
        if (!core.isEmpty(this.defaultSettings)) {
            var compositeConfig = core.extend({}, this.defaultSettings);
            ngConfig = core.extend(compositeConfig, ngConfig);
        }

        httpService(ngConfig).success(function (data, status, headers, xconfig) {
            // HACK: because $http returns a server side null as a string containing "null" - this is WRONG. 
            if (data === "null") data = null;
            var httpResponse = {
                data: data,
                status: status,
                getHeaders: headers,
                config: config
            };
            config.success(httpResponse);
        }).error( function (data, status, headers, xconfig) {
            var httpResponse = {
                data: data,
                status: status,
                getHeaders: headers,
                config: config
            };
            config.error(httpResponse);
        });
        
    };

    function encodeParams(obj) {
        var query = '';
        var  key, subValue, innerObj;

        for (var name in obj) {
            var value = obj[name];

            if (value instanceof Array) {
                for (var i = 0; i < value.length; ++i) {
                    subValue = value[i];
                    fullSubName = name + '[' + i + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += encodeParams(innerObj) + '&';
                }
            } else if (value instanceof Object) {
                for (var subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += encodeParams(innerObj) + '&';
                }
            } else if (value !== undefined) {
                query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
            }
        }

        return query.length ? query.substr(0, query.length - 1) : query;
    }

    
    breeze.config.registerAdapter("ajax", ctor);
    
}));
