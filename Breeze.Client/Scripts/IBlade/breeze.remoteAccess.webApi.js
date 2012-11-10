(function(factory) {
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
    var entityModel = breeze.entityModel;
    var core = breeze.core;

    var EntityType = entityModel.EntityType;

    var impl = {};

    // -------------------------------------------
    var ajax;

    impl.name = "webApi";
    
    impl.initialize = function () {
        var ajaxImpl = core.config.ajaxImplementation;
        ajax = ajaxImpl.ajax;
        if (!ajax) {
            throw new Error("Breeze was unable to find an 'ajaxImplementation'");
        }
    };

    impl.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
        var metadataSvcUrl = getMetadataUrl(serviceName);
        ajax({
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

    impl.executeQuery = function (entityManager, odataQuery, collectionCallback, errorCallback) {

        var url = entityManager.serviceName + odataQuery;
        ajax({
            url: url,
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                // jQuery.getJSON(url).done(function (data, textStatus, jqXHR) {
                // TODO: check response object here for possible errors.
                try {
                    data.XHR = jqXHR;
                    collectionCallback(data);
                } catch(e) {
                    var error = createError(jqXHR);
                    error.internalError = e;
                    // needed because it doesn't look like jquery calls .fail if an error occurs within the function
                    if (errorCallback) errorCallback(error);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (errorCallback) errorCallback(createError(jqXHR));
            }
        });
    };

    impl.saveChanges = function (entityManager, saveBundleStringified, callback, errorCallback) {
        var url = entityManager.serviceName + "SaveChanges";
        ajax({
            url: url,
            type: "POST",
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
    impl.getEntityType = function (rawEntity, metadataStore) {
        // TODO: may be able to make this more efficient by caching of the previous value.
        var entityTypeName = EntityType._getNormalizedTypeName(rawEntity["$type"]);
        return entityTypeName && metadataStore.getEntityType(entityTypeName, true);
    };

    //impl.getEntityTypeName = function (rawEntity) {
    //    return EntityType._getNormalizedTypeName(rawEntity["$type"]);
    //};

    impl.getDeferredValue = function (rawEntity) {
        // there are no deferred entries in the web api.
        return false;
    };

    impl.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['$ref'];
        if (id) {
            var entity = queryContext.refMap[id];
            if (entity === undefined) {
                return function () { return queryContext.refIdMap[id]; };
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
    
    core.config.registerInterface("remoteAccess", impl);

}));