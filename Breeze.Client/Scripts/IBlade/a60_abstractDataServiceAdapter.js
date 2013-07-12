breeze.AbstractDataServiceAdapter = (function () {
    
    var ajaxImpl;
    
    var ctor = function () {
    
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

    ctor.prototype.fetchMetadata = function (metadataStore, dataService) {
        var serviceName = dataService.serviceName;
        var url = dataService.makeUrl("Metadata");
        
        var deferred = Q.defer();

        var that = this;
        ajaxImpl.ajax({
            url: url,
            dataType: 'json',
            success: function (data, textStatus, XHR) {
                var error;
                // might have been fetched by another query
                if (metadataStore.hasMetadataFor(serviceName)) {
                    return deferred.resolve("already fetched");
                }
                var metadata = typeof (data) === "string" ? JSON.parse(data) : data;
                
                if (metadata) {
                    try {
                        metadataStore.importMetadata(metadata);
                    } catch (e) {
                        error = new Error("Metadata import failed for " + url + "; Unable to process returned metadata:" + e.message);
                    }
                } else {
                    error = new Error("Metadata query failed for: " + url);
                }

                if (error) {
                    return deferred.reject(error)
                }

                // import may have brought in the service.
                if (!metadataStore.hasMetadataFor(serviceName)) {
                    metadataStore.addDataService(dataService);
                }
                
                XHR.onreadystatechange = null;
                XHR.abort = null;

                deferred.resolve(metadata);
                
            },
            error: function (XHR, textStatus, errorThrown) {
                that._handleXHRError(deferred, XHR, "Metadata query failed for: " + url);
            }
        });
        return deferred.promise;
    };

    ctor.prototype.executeQuery = function (mappingContext) {

        var deferred = Q.defer();

        var that = this;
        var params = {
            url: mappingContext.url,
            dataType: 'json',
            success: function(data, textStatus, XHR) {
                try {
                    var rData;
                    if (data && data.Results) {
                        rData = { results: data.Results, inlineCount: data.InlineCount, XHR: XHR };
                    } else {
                        rData = { results: data, XHR: XHR };
                    }
                    
                    deferred.resolve(rData);
                    XHR.onreadystatechange = null;
                    XHR.abort = null;
                } catch(e) {
                    var error = e instanceof Error ? e : that._createError(XHR);
                    // needed because it doesn't look like jquery calls .fail if an error occurs within the function
                    deferred.reject(error);
                    XHR.onreadystatechange = null;
                    XHR.abort = null;
                }

            },
            error: function(XHR, textStatus, errorThrown) {
                that._handleXHRError(deferred, XHR);
            }
        };
        if (mappingContext.dataService.useJsonp) {
            params.dataType = 'jsonp';
            params.crossDomain = true;
        }
        ajaxImpl.ajax(params);
        return deferred.promise;
    };

    ctor.prototype.saveChanges = function (saveContext, saveBundle) {
        
        var deferred = Q.defer();
        saveBundle = this._prepareSaveBundle(saveBundle, saveContext);
        var bundle = JSON.stringify(saveBundle);
        
        var url = saveContext.dataService.makeUrl(saveContext.resourceName);

        var that = this;
        ajaxImpl.ajax({
            url: url,
            type: "POST",
            dataType: 'json',
            contentType: "application/json",
            data: bundle,
            success: function (data, textStatus, XHR) {
                var error = data.Error || data.error;
                if (error) {
                    // anticipatable errors on server - concurrency...
                    var err = that._createError(XHR);
                    err.message = error;
                    deferred.reject(err);
                } else {
                    var saveResult = that._prepareSaveResult(saveContext, data);
                    deferred.resolve(saveResult);
                }
                
            },
            error: function (XHR, textStatus, errorThrown) {
                that._handleXHRError(deferred, XHR);
            }
        });

        return deferred.promise;
    };

    ctor.prototype._prepareSaveBundle = function(saveBundle, saveContext) {
        throw new Error("Need a concrete implementation of _prepareSaveBundle");
    };

    ctor.prototype._prepareSaveResult = function (saveContext, data) {
        throw new Error("Need a concrete implementation of _prepareSaveResult");
    };
    
    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter( {
        name: "noop",
        
        visitNode: function (node, mappingContext, nodeContext) {
            return {};
        }

    });
   
    ctor.prototype._handleXHRError = function(deferred, XHR, messagePrefix) {
        var err = this._createError(XHR);
        if (messagePrefix) {
            err.message = messagePrefix + "; " + err.message;
        }
        deferred.reject(err);
        XHR.onreadystatechange = null;
        XHR.abort = null;
    };

    ctor.prototype._createError = function(XHR) {
        var err = new Error();
        err.XHR = XHR;
        
        err.responseText = XHR.responseText;
        err.status = XHR.status;
        err.statusText = XHR.statusText;
        err.message = XHR.statusText;
        if (err.responseText) {
            try {
                var responseObj = JSON.parse(XHR.responseText);
                err.detail = responseObj;
                var source = responseObj.InnerException || responseObj;
                err.message = source.ExceptionMessage || source.Message || XHR.responseText;
            } catch (e) {
                err.message = err.message + ": " + err.responseText;
            }
        }
        return err;
    };
    
    return ctor;

})();
