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

    ctor.prototype.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
        var metadataSvcUrl = getMetadataUrl(serviceName);
        ajaxImpl.ajax({
            url: metadataSvcUrl,
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                // jQuery.getJSON(metadataSvcUrl).done(function (data, textStatus, jqXHR) {
                var metadata = JSON.parse(data);
                if (!metadata) {
                    if (errorCallback) errorCallback(new Error("Metadata query failed for: " + metadataSvcUrl));
                    return;
                }
                // setProperties metadataStore    
                // if from Edmx
                var schema = metadata.schema;
                if (!schema) {
                    // if from DbContext 
                    schema = metadata.conceptualModels.schema;
                    schema.cSpaceOSpaceMapping = metadata.conceptualModels.cSpaceOSpaceMapping;
                    if (!schema) {
                        if (errorCallback) errorCallback(new Error("Metadata query failed for " + metadataSvcUrl + "; Unable to locate 'schema' member in metadata"));
                        return;
                    }
                }
                metadataStore._parseODataMetadata(serviceName, schema);
                if (callback) {
                    callback(schema);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                var err = createError(jqXHR);
                err.message = "Metadata query failed for: " + metadataSvcUrl + "; " + (err.message || "");
                if (errorCallback) errorCallback(err);
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
                // TODO: check response object here for possible errors.
                try {
                    var inlineCount = XHR.getResponseHeader("X-InlineCount");

                    if (inlineCount) {
                        inlineCount = parseInt(inlineCount, 10);
                    }
                    collectionCallback({ results: data, XHR: XHR, inlineCount: inlineCount });
                } catch(e) {
                    var error = createError(XHR);
                    error.internalError = e;
                    // needed because it doesn't look like jquery calls .fail if an error occurs within the function
                    if (errorCallback) errorCallback(error);
                }
            },
            error: function(XHR, textStatus, errorThrown) {
                if (errorCallback) errorCallback(createError(XHR));
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
            success: function(data, textStatus, jqXHR) {
                if (data.Error) {
                    // anticipatable errors on server - concurrency...
                    var err = createError(jqXHR);
                    err.message = data.Error;
                    errorCallback(err);
                } else {
                    data.XHR = jqXHR;
                    callback(data);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (errorCallback) errorCallback(createError(jqXHR));
            }
        });
    };

    // will return null if anon
    ctor.prototype.getEntityType = function (rawEntity, metadataStore) {
        // TODO: may be able to make this more efficient by caching of the previous value.
        var entityTypeName = EntityType._getNormalizedTypeName(rawEntity["$type"]);
        return entityTypeName && metadataStore.getEntityType(entityTypeName, true);
    };

    //impl.getEntityTypeName = function (rawEntity) {
    //    return EntityType._getNormalizedTypeName(rawEntity["$type"]);
    //};

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

    };

    function createError(jqXHR) {
        var err = new Error();
        err.XHR = jqXHR;
        err.message = jqXHR.statusText;
        err.responseText = jqXHR.responseText;
        err.status = jqXHR.status;
        err.statusText = jqXHR.statusText;
        if (err.responseText) {
            try {
                var responseObj = JSON.parse(jqXHR.responseText);
                err.detail = responseObj;
                if (responseObj.ExceptionMessage) {
                    err.message = responseObj.ExceptionMessage;
                } else if (responseObj.InnerException) {
                    err.message = responseObj.InnerException.Message;
                } else if (responseObj.Message) {
                    err.message = responseObj.Message;
                } else {
                    err.message = jqXHR.responseText;
                }
            } catch (e) {

            }
        }
        return err;
    }
    
    breeze.config.registerAdapter("dataService", ctor);

}));