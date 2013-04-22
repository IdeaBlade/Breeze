(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }    
}(function(breeze) {
    
    var core = breeze.core;

    var MetadataStore = breeze.MetadataStore;
    var JsonResultsAdapter = breeze.JsonResultsAdapter;
    
    
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
        var url = dataService.makeUrl("Metadata");
        
        ajaxImpl.ajax({
            url: url,
            dataType: 'json',
            success: function(data, textStatus, XHR) {
                // might have been fetched by another query
                if (metadataStore.hasMetadataFor(serviceName)) {
                    callback("already fetched");
                    return;
                }
                var metadata = typeof (data) === "string" ? JSON.parse(data) : data;
                
                if (!metadata) {
                    if (errorCallback) errorCallback(new Error("Metadata query failed for: " + url));
                    return;
                }

                try {
                    metadataStore.importMetadata(metadata);
                } catch (e) {
                    errorCallback(new Error("Metadata query failed for " + url + "; Unable to process returned metadata:" + e.message));
                    return;
                }

                // import may have brought in the service.
                if (!metadataStore.hasMetadataFor(serviceName)) {
                    metadataStore.addDataService(dataService);
                }
                
                if (callback) {
                    callback(metadata);
                }
                
                XHR.onreadystatechange = null;
                XHR.abort = null;
                
            },
            error: function (XHR, textStatus, errorThrown) {
                handleXHRError(XHR, errorCallback, "Metadata query failed for: " + url);
            }
        });
    };
    

    ctor.prototype.executeQuery = function (mappingContext, collectionCallback, errorCallback) {

        var params = {
            url: mappingContext.url,
            dataType: 'json',
            success: function(data, textStatus, XHR) {
                try {
                    var rData;
                    if (data.Results) {
                        rData = { results: data.Results, inlineCount: data.InlineCount, XHR: XHR };
                    } else {
                        rData = { results: data, XHR: XHR };
                    }
                    
                    collectionCallback(rData);
                    XHR.onreadystatechange = null;
                    XHR.abort = null;
                } catch(e) {
                    var error = e instanceof Error ? e : createError(XHR);
                    // needed because it doesn't look like jquery calls .fail if an error occurs within the function
                    if (errorCallback) errorCallback(error);
                    XHR.onreadystatechange = null;
                    XHR.abort = null;
                }

            },
            error: function(XHR, textStatus, errorThrown) {
                handleXHRError(XHR, errorCallback);
            }
        };
        if (mappingContext.dataService.useJsonp) {
            params.dataType = 'jsonp';
            params.crossDomain = true;
        }
        ajaxImpl.ajax(params);
    };

    ctor.prototype.saveChanges = function (saveContext, saveBundle, callback, errorCallback) {
        
        var bundle = prepareSaveBundle(saveBundle, saveContext);
        
        var url = saveContext.dataService.makeUrl(saveContext.resourceName);
        
        ajaxImpl.ajax({
            url: url,
            type: "POST",
            dataType: 'json',
            contentType: "application/json",
            data: bundle,
            success: function(data, textStatus, XHR) {
                if (data.Error) {
                    // anticipatable errors on server - concurrency...
                    var err = createError(XHR);
                    err.message = data.Error;
                    errorCallback(err);
                } else {
                    // HACK: need to change the 'case' of properties in the saveResult
                    // but KeyMapping properties internally are still ucase. ugh...
                    var keyMappings = data.KeyMappings.map(function(km) {
                        var entityTypeName = MetadataStore.normalizeTypeName(km.EntityTypeName);
                        return { entityTypeName: entityTypeName, tempValue: km.TempValue, realValue: km.RealValue };
                    });
                    var saveResult = { entities: data.Entities, keyMappings: keyMappings, XHR: data.XHR };
                    callback(saveResult);
                }
            },
            error: function (XHR, textStatus, errorThrown) {
                handleXHRError(XHR, errorCallback);
            }
        });
    };

    function prepareSaveBundle(saveBundle, saveContext) {
        var em = saveContext.entityManager;
        var metadataStore = em.metadataStore;
        var helper = em.helper;

        saveBundle.entities = saveBundle.entities.map(function (e) {
            var rawEntity = helper.unwrapInstance(e);

            var autoGeneratedKey = null;
            if (e.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                autoGeneratedKey = {
                    propertyName: e.entityType.keyProperties[0].nameOnServer,
                    autoGeneratedKeyType: e.entityType.autoGeneratedKeyType.name
                };
            }

            var originalValuesOnServer = helper.unwrapOriginalValues(e, metadataStore);
            rawEntity.entityAspect = {
                entityTypeName: e.entityType.name,
                defaultResourceName: e.entityType.defaultResourceName,
                entityState: e.entityAspect.entityState.name,
                originalValuesMap: originalValuesOnServer,
                autoGeneratedKey: autoGeneratedKey
            };
            return rawEntity;
        });

        saveBundle.saveOptions = { tag: saveBundle.saveOptions.tag };

        var saveBundleStringified = JSON.stringify(saveBundle);
        return saveBundleStringified;
    }
    
    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter({
        
        name: "webApi_default",
        
        visitNode: function (node, mappingContext, nodeContext ) {
            var entityTypeName = MetadataStore.normalizeTypeName(node.$type);
            var entityType = entityTypeName && mappingContext.entityManager.metadataStore._getEntityType(entityTypeName, true);
            var propertyName = nodeContext.propertyName;
            var ignore = propertyName && propertyName.substr(0, 1) === "$";

            return {
                entityType: entityType,
                nodeId: node.$id,
                nodeRefId: node.$ref,
                ignore: ignore
            };
        },
        
    });
    
   
    function handleXHRError(XHR, errorCallback, messagePrefix) {

        if (!errorCallback) return;
        var err = createError(XHR);
        if (messagePrefix) {
            err.message = messagePrefix + "; " + err.message;
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
            } catch (e) {

            }
        }
        return err;
    }
    
    breeze.config.registerAdapter("dataService", ctor);

}));