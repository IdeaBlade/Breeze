docCode.AjaxAdapterTestInterceptor = (function () {
    /** 
     A test 'ajax' adapter class whose instance can monitor a base ajax adapter
     with 'before', 'afterSuccess', 'afterError' methods and 
     synchronously return a canned response for a given request url.

     You can supply any number of canned responses. Each has a url pattern which
     is compared with the ajax request url. The first matching response becomes
     the faked response of the ajax request.

     If none of the response match but there is a default response, 
     the default becomes the faked response of the ajax request.

     If there still is no canned response, the request is forwarded to
     the 'ajax' function of the base adapter.
 
     After instantiating a test adapter, call its enable() method to enable its injection into the
     base ajax adapter. Call its disable() method to restore the pre-injection behavior.

     Example:
         var ajaxInterceptor = new AjaxAdapterTestInterceptor();

         module("AjaxAdapterTestInterceptor unit tests", {
            setup: function () {
                // unit tests should never attempt to reach the server
                // the blockServerRequests switch ensures that the AjaxAdapterTestInterceptor
                // doesn't accidentally go to the server during these module tests
                ajaxInterceptor.blockServerRequests = true;
            },
                teardown: function () {
                ajaxInterceptor.blockServerRequests = false; // restore default
                ajaxInterceptor.disable();
            }
        });

        // the config.blockServerRequests switch ensures that 
        // this particular request cannot accidentally go to the server
        // even if the test adapter would allow it otherwise.
        test("server requests are blocked for THIS module's tests by default.", 1, function () {
            ajaxInterceptor.enable();
        
            var ajaxConfig = makeAjaxConfig({ success: success, error: error });

            ajaxInterceptor.ajax(ajaxConfig);

            function success(httpResponse) {
                ok(false, "request should have been blocked and failed");
            }
            function error(httpResponse) {
                ok(/server requests are blocked/i.test(httpResponse.data),
                    serverRequestBlockMessage(httpResponse));
            }
        });
    **/ 
    var extend = breeze.core.extend;
    var clone = function (thing) { return extend({}, thing); };
    
    /** AjaxAdapterTestInterceptor
    @constructor 
    The constructor takes an optional 'config' object and optional 'adaptername'
  
    @param [adapterName] {String} The name of the ajax adapter to hijack. Hijacks the default adapter by default.

    @param [config] {Object} The optional "TestAdapterConfig" hash. All of its members are optional. 
    
    Adapter behavior is driven by this configuration object which can be supplied
    during instantiation and/or modified/reset later via the adapter's testAdapterConfig property.

    @param [config.defaultResponse] {Object} Response to return if there is no match with the ajax config.url
        @param [config.defaultResponse.data] {Object} Faked JSON data or error object
        @param [config.defaultResponse.status=200]: {Number} Faked XHR.status, the HTTP status Code
        @param [config.defaultResponse.headers] {Object} Faked headers as hash where key=header-name, value=header-value 
        @param [config.defaultResponse.isError] {Boolean} true if should treat this call as an error.
        The test adapter follows the "success path" (calls ajaxSettings.Success) if 'isError' is false and the
        status is a 200. Otherwise it follows the "error path" (calls ajaxSettings.error).

    @param [config.responses] {Array of Object} Each response is as defined for default response 
    with an additional 'url' property, a {String} url pattern to match the response to the ajax config.url.
    The adapter picks the first response with a matching url pattern.
    @param [config.urlMatcher] {Function} Returns true if a response.url matches the ajax config.url. 
    Default matcher is a RegEx matcher that treats the response.url as a RegExp pattern.
    @param [config.blockServerRequests=false] {Boolean} Fail immediately if otherwise would attempt to 
    reach the server as when there are no matching fake responses.
    Blocked regardless if the adapter's own 'blockServerRequests' is true;
    @param [config.before] {Function} Something to do before the ajax operation begins
    @param [config.afterSuccess] {Function} Something to do after the ajax operation returns a successful result
    @param [config.afterAfter] {Function} Something to do after the ajax operation returns with an error

    @param [config] {Array} This is a convenience version of the TestAdapterConfig which the adapter translates to
    a config that returns the array as the successful (StatusCode 200) data result for any requested URL.

    before(origAjaxSettings, response)
    @param origAjaxSettings {Object) The original ajax configuation parameter from the caller
    @param [response] {Object} The test response object if there is one. 

    afterSuccess(origAjaxSettings, response, httpResponse);
    @param origAjaxSettings {Object) The original ajax configuation parameter from the caller
    @param [response] {Object} The test response object if there was one.    
    @param [httpResponse] {Object} HttpResponse object returned from the base adapter or faked. 

    afterError(origAjaxSettings, response, httpResponse);
    @param origAjaxSettings {Object) The original ajax configuation parameter from the caller
    @param [response] {Object} The test response object if there was one.
    @param [httpResponse] {Object} HttpResponse object returned from the base adapter or faked. 


    urlMatcher(url, pattern)
    @param url {String} the ajax config.url
    @param pattern {String} the pattern defined in the response.url
    @return {Boolean} true if the response matches this url

 **/
    var interceptor = function (config, adapterName) {
     
        var adapter = breeze.config.getAdapterInstance("ajax", adapterName);
        if (!adapter) {
            throw new Error("No existing " + adapterName + " ajax adapter to fake.");
        }       
        
        /**
        The default settings to copy to an ajax fn call
        Initialized with the source ajax adapter.defaultSettings
        @property defaultSettings {Object}
        **/
        this.defaultSettings = adapter.defaultSettings;

        /**
        The current configuration for this adapter. See the class description
        @property testAdapterConfig {Object}
        **/
        this.testAdapterConfig = config;
        
        /**
        Enable the AjaxAdapterTestInterceptor, replacing the wrapped adapter's ajax fn with the test version
        @method enable
        @param [config] {object} Optionally replace the adapter's current configuration
        **/
        this.enable = function (adapterConfig) {
            if (adapterConfig) {
                // overwrite testAdapterConfig
                this.testAdapterConfig = adapterConfig;
            }
            adapter.ajax = fakeAjaxFn;
        };

        /**
        Disable the AjaxAdapterTestInterceptor, restoring the original ajax fn
        @method disable
        **/
        this.disable = function () {
            adapter.ajax = origAjaxFn;
        };

        /**
        Ensure that the test adapter does not make a server request when enabled.
        @property blockServerRequests=false {Boolean}
        **/
        this.blockServerRequests = false;
        
        var origAjaxFn = adapter.ajax;
        var getAdapterConfig = createGetAdapterConfigFn(this);
        var fakeAjaxFn = createFakeAjaxFn(getAdapterConfig, origAjaxFn);       

        /**
        Delegate to the adapter's current ajax function
        @method ajax
        @param ajaxSettings {Object} parameter to adapter's ajax method. 
        See breeze documentation for {@link http://www.breezejs.com/documentation/customizing-ajax ajaxadapter}
        **/
        this.ajax = function (ajaxSettings) { adapter.ajax(ajaxSettings); };

    };

    return interceptor;
    
    //#region private functions
    function createFakeAjaxFn(getAdapterConfig, origAjaxFn) {

        return function (origAjaxSettings) {

            var ajaxSettings = clone(origAjaxSettings); 

            var adapterConfig = getAdapterConfig();
            
            if (adapterConfig.defaultSettings) {
                // Revised ajax config is the clone of the default settings 
                // overlayed with the previous ajax config
                var compositeSettings = clone(adapterConfig.defaultSettings);
                ajaxSettings = extend(compositeSettings, ajaxSettings);
            }

            var before = adapterConfig.before || noop;
            var afterSuccess = adapterConfig.afterSuccess || noop;
            var afterError = adapterConfig.afterError || noop;

            // look for a fake response for this url
            // TODO: use regex to match url!
            var response = matchResponse(ajaxSettings.url, adapterConfig.responses, adapterConfig.urlMatcher);
            response = response || adapterConfig.defaultResponse;

            // wrap success and fail fns
            var origSuccessFn = origAjaxSettings.success || noop;
            ajaxSettings.success = function(httpResponse) {
                afterSuccess(origAjaxSettings, httpResponse);
                origSuccessFn(httpResponse);
            };
            var origErrorFn = origAjaxSettings.error || noop;
            ajaxSettings.error = function(httpResponse) {
                afterError(origAjaxSettings, response, httpResponse);
                origErrorFn(httpResponse);
            };

            before(origAjaxSettings, response);

            if (!response) { // no applicable fake response                
                origAjaxFn(ajaxSettings); //pass thru to original ajax fn
                return;
            }

            // Using fakeResponse
            var fakeHttpResponse = {
                // Breeze expects the following
                status: response.status || 200,
                
                getHeaders: createGetHeaders(response),
                // diagnostics; not in a real xhr
                __fakeResponse: response,
                __ajaxSettings: origAjaxSettings
            };
            if (response.xhr) {
                fakeHttpResponse = extend(fakeHttpResponse, response);
            }

            var isError = response.isError || fakeHttpResponse.status < 200 || fakeHttpResponse.status >= 300;
            

            if (isError) {
                fakeHttpResponse.data = response.data || new Error("fake ajax error");
                ajaxSettings.error(fakeHttpResponse);
            } else {
                fakeHttpResponse.data = response.data || [];
                ajaxSettings.success(fakeHttpResponse);
            }
        };
    }
    
    function createGetAdapterConfigFn(testAdapter) {

        return function() {
            var adapterConfig = testAdapter.testAdapterConfig;
            
            if (isArray(adapterConfig)) {
                // Assume a simple array is a simple adapterConfig specifying
                // the JSON results to return for any URL
                adapterConfig = { defaultResponse: { data: adapterConfig } };
            }

            if (adapterConfig === undefined || adapterConfig === null) {
                adapterConfig = {};
            } else if (!isObject(adapterConfig)) {
                throw new Error("TestAdapterConfig must be an object or an array of JSON results");
            }

            if (testAdapter.blockServerRequests || adapterConfig.blockServerRequests) {
                // Outbound requests are disallowed; ensure a failing defaultResponse
                var emsg = "Server requests are blocked by configuration";
                adapterConfig.defaultResponse = adapterConfig.defaultResponse || {
                    status: 503,
                    data: new Error(emsg)
                };
            }
            
            adapterConfig.defaultSettings = testAdapter.defaultSettings;
            
            return adapterConfig;
        };
    }
    
    function isArray(thing) {
        return Object.prototype.toString.call(thing) === "[object Array]";
    }
    
    function isObject(thing) {
        return Object.prototype.toString.call(thing) === "[object Object]";
    }
    
    function matchResponse(url, responses, urlMatcher) {
        if (!responses || !url) { return null; }
        if (!isArray(responses)) { responses = [responses]; }
        urlMatcher = urlMatcher || regExUrlMatcher;

        for (var i = 0, len = responses.length; i < len; i++) {
            try {
                var response = responses[i];
                if (urlMatcher(url, response.url)) {
                    return response;
                }
            } catch (ex) {/* match failed; skip to the next response */ }
        }
        return null;
    }

    function regExUrlMatcher(url, pattern) {
        return (new RegExp(pattern)).test(url);
    }

    
    function createGetHeaders(response) {
        return function (headerName) {
            if (headerName) {
                return response.headers[headerName];
            } else {
                return response.headers;
            }
        };
    }

    function noop() { }
    
    //#endregion

})();