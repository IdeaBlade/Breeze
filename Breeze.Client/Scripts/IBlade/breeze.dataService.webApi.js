(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }    
}(function(breeze) {
    
    var core = breeze.core;

    var EntityType = breeze.EntityType;

    
    var ajaxImpl;
    
    var ctor = function () {
        this.name = "webApi";
    };

    ctor.prototype.checkForRecomposition = function (interfaceInitializedArgs) {
        if (interfaceInitializedArgs.interfaceName === "ajax" && interfaceInitializedArgs.isDefault) {
            this.initialize();
        }
    };
    
    ctor.prototype.initialize = function () {
        ajaxImpl = breeze.config.getAdapterInstance("ajax");

        if (!ajaxImpl) {
            throw new Error("Unable to initialize ajax for WebApi.");
        }

        // don't cache 'ajax' because we then we would need to ".bind" it, and don't want to because of brower support issues. 
        var ajax = ajaxImpl.ajax;
        if (!ajax) {
            throw new Error("Breeze was unable to find an 'ajax' adapter");
        }
    };

    ctor.prototype.fetchMetadata = function (metadataStore, dataService, callback, errorCallback) {
        var serviceName = dataService.serviceName;
        var metadataSvcUrl = getMetadataUrl(serviceName);
        ajaxImpl.ajax({
            url: metadataSvcUrl,
            dataType: 'json',
            success: function(data, textStatus, XHR) {
                
                var metadata = JSON.parse(data);
                if (!metadata) {
                    if (errorCallback) errorCallback(new Error("Metadata query failed for: " + metadataSvcUrl));
                    return;
                }

                var schema = metadata.schema; // || metadata.dataServices.schema; ... for ODataModelBuilder maybe later
                
                if (!schema) {
                    if (errorCallback) errorCallback(new Error("Metadata query failed for " + metadataSvcUrl + "; Unable to locate 'schema' member in metadata"));
                    return;
                }
                
                // might have been fetched by another query
                if (!metadataStore.hasMetadataFor(serviceName)) {
                    metadataStore._parseODataMetadata(serviceName, schema);
                    metadataStore.addDataService(dataService);
                }
                
                if (callback) {
                    callback(schema);
                }
                
                XHR.onreadystatechange = null;
                XHR.abort = null;
                
            },
            error: function (XHR, textStatus, errorThrown) {
                handleXHRError(XHR, errorCallback, "Metadata query failed for: " + metadataSvcUrl);
            }
        });
    };
    

    ctor.prototype.executeQuery = function (entityManager, odataQuery, collectionCallback, errorCallback) {

        var url = entityManager.serviceName + odataQuery;
        ajaxImpl.ajax({
            url: url,
            dataType: 'json',
            success: function(data, textStatus, XHR) {
                // jQuery.getJSON(url).done(function (data, textStatus, jqXHR) {
                try {
                    var inlineCount = XHR.getResponseHeader("X-InlineCount");

                    if (inlineCount) {
                        inlineCount = parseInt(inlineCount, 10);
                    }
                    collectionCallback({ results: data, XHR: XHR, inlineCount: inlineCount });
                    XHR.onreadystatechange = null;
                    XHR.abort = null;
                } catch (e) {
                    var error = e instanceof Error ? e : createError(XHR);
                    // needed because it doesn't look like jquery calls .fail if an error occurs within the function
                    if (errorCallback) errorCallback(error);
                    XHR.onreadystatechange = null;
                    XHR.abort = null;
                }
                
            },
            error: function (XHR, textStatus, errorThrown) {
                handleXHRError(XHR, errorCallback);
            }
        });
    };

    ctor.prototype.saveChanges = function (entityManager, saveBundleStringified, callback, errorCallback) {
        var url = entityManager.serviceName + "SaveChanges";
        ajaxImpl.ajax({
            url: url,
            type: "POST",
            dataType: 'json',
            contentType: "application/json",
            data: saveBundleStringified,
            success: function(data, textStatus, XHR) {
                if (data.Error) {
                    // anticipatable errors on server - concurrency...
                    var err = createError(XHR);
                    err.message = data.Error;
                    errorCallback(err);
                } else {
                    data.XHR = XHR;
                    callback(data);
                }
            },
            error: function (XHR, textStatus, errorThrown) {
                handleXHRError(XHR, errorCallback);
            }
        });
    };

    // will return null if anon
    ctor.prototype.getEntityType = function (rawEntity, metadataStore) {
        // TODO: may be able to make this more efficient by caching of the previous value.
        var entityTypeName = EntityType._getNormalizedTypeName(rawEntity["$type"]);
        return entityTypeName && metadataStore.getEntityType(entityTypeName, true);
    };

    ctor.prototype.getDeferredValue = function (rawEntity) {
        // there are no deferred entries in the web api.
        return false;
    };

    ctor.prototype.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['$ref'];
        if (id) {
            var entity = queryContext.refMap[id];
            if (entity === undefined) {
                return function () { return queryContext.refMap[id]; };
            } else {
                return entity;
            }
        }

        queryContext.refId = rawEntity['$id'];
    };


    function getMetadataUrl(serviceName) {
        var metadataSvcUrl = serviceName;
        // remove any trailing "/"
        if (core.stringEndsWith(metadataSvcUrl, "/")) {
            metadataSvcUrl = metadataSvcUrl.substr(0, metadataSvcUrl.length - 1);
        }
        // ensure that it ends with /Metadata 
        if (!core.stringEndsWith(metadataSvcUrl, "/Metadata")) {
            metadataSvcUrl = metadataSvcUrl + "/Metadata";
        }
        return metadataSvcUrl;

    }
    
    function handleXHRError(XHR, errorCallback, messagePrefix) {

        if (!errorCallback) return;
        var err = createError(XHR);
        if (messagePrefix) {
            err.message = messagePrefix + "; " + +err.message;
        }
        errorCallback(err);
        XHR.onreadystatechange = null;
        XHR.abort = null;
    }

    function createError(XHR) {
        var err = new Error();
        err.XHR = XHR;
        err.message = XHR.statusText;
        err.responseText = XHR.responseText;
        err.status = XHR.status;
        err.statusText = XHR.statusText;
        if (err.responseText) {
            try {
                var responseObj = JSON.parse(XHR.responseText);
                err.detail = responseObj;
                var source = responseObj.InnerException || responseObj;
                err.message = source.ExceptionMessage || source.Message || XHR.responseText;
                //if (responseObj.InnerException) {
                //    err.message = responseObj.InnerException.ExceptionMessage || responseObj.InnerException.Message;
                //} else {
                //    err.message = responseObj.ExceptionMessage || responseObj.Message;
                //} 
                //if (!err.message) {
                //    err.message = XHR.responseText;
                //}

                //if (responseObj.ExceptionMessage) {
                //    err.message = responseObj.ExceptionMessage;
                //} else if (responseObj.InnerException) {
                //    err.message = responseObj.InnerException.Message;
                //} else if (responseObj.Message) {
                //    err.message = responseObj.Message;
                //} else {
                //    err.message = XHR.responseText;
                //}
            } catch (e) {

            }
        }
        return err;
    }
    
    breeze.config.registerAdapter("dataService", ctor);

}));