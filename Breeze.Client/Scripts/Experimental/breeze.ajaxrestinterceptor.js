//#region Copyright, Version, and Description
/*
 * Copyright 2013 IdeaBlade, Inc.  All Rights Reserved.  
 * Use, reproduction, distribution, and modification of this code is subject to the terms and 
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Ward Bell
 * Version: 1.0
  * --------------------------------------------------------------------------------
 * Converts typical entity-by-id query into a url format typical in ReST-like APIs
 * Experimental! This is a primitive implementation, not currently "supported".
 * Use it for guidance and roll your own.
 */
 //#endregion

breeze.AjaxRestInterceptor = (function () {
    /**
     Wraps the ambient breeze ajax adapter's `ajax` method with an interceptor
     that converts certain URLs into a more "ReSTy" design.
    
     Ex: Converts '/breeze/orders/?$filter=id eq 1' into '/breeze/orders/1'.
      
     After instantiating the adapter, call its enable() method to enable its injection into the
     base ajax adapter. Call its disable() method to restore the pre-injection behavior.
    
     **/

    var AjaxRestInterceptor = function (adapterName) {

        var adapter = breeze.config.getAdapterInstance("ajax", adapterName);
        if (!adapter) {
            throw new Error("No existing " + adapterName + " ajax adapter to adapt.");
        }
        var interceptor = this;
        
        interceptor.origAjaxFn = adapter.ajax;
        interceptor.restyAjaxFn = createRestyAjaxFn(interceptor);
        
        /**
        Enable the adapter, replacing the wrapped adapter's ajax fn with an intercepting version
        **/
        this.enable = function() {
            adapter.ajax = interceptor.restyAjaxFn;
        };

        /**
        Disable the AjaxAdapterTestInterceptor, restoring the original ajax fn
        **/
        this.disable = function() {
            adapter.ajax = interceptor.origAjaxFn;
        };

    };

    return AjaxRestInterceptor;

    function createRestyAjaxFn(interceptor) {
        
        // This simplistic implementation can only convert requests for a resource by id
        // It can only convert a URL with this one query parameter: "?$filter=id eq ...".
        // The key must be something ending in "id" and it must be the 1st and only filter expression
        // e.g. 'breeze/orders/?$filter=id%20eq%201' 
        //         becomes '/breeze/orders/1'
        //      "breeze/Customers?$filter=CustomerID%20eq%20guid'785efa04-cbf2-4dd7-a7de-083ee17b6ad2'"
        //         becomes '/breeze/orders/785efa04-cbf2-4dd7-a7de-083ee17b6ad2'
        return function (settings) {
            var url = settings.url;
            settings.url = url.replace(/(\/)?\?\$filter=\w*[iI][dD]%20eq%20(guid\')?([\w-]+)(')?$/, '/$3');
            interceptor.diagnostics = {
                lastOrigUrl: url,
                lastSettings: settings
            };
            
            //Delegate to the adapter's current ajax function
            //See breeze documentation for {@link http://www.breezejs.com/documentation/customizing-ajax ajaxadapter}
            return interceptor.origAjaxFn(settings);
        };
    }

})();