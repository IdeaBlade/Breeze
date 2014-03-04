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

        // don't cache 'ajax' because then we would need to ".bind" it, and don't want to because of brower support issues. 
        if (ajaxImpl && ajaxImpl.ajax) { return; }
        throw new Error("Unable to find ajax adapter for dataservice adapter '"+(this.name||'')+"'.");
    };

    ctor.prototype.fetchMetadata = function (metadataStore, dataService) {
        var serviceName = dataService.serviceName;
        var url = dataService.makeUrl("Metadata");
        
        var deferred = Q.defer();

        var that = this;
        ajaxImpl.ajax({
            type: "GET",
            url: url,
            dataType: 'json',
            success: function (httpResponse) {
                
                // might have been fetched by another query
                if (metadataStore.hasMetadataFor(serviceName)) {
                    return deferred.resolve("already fetched");
                }
                var data = httpResponse.data;
                try {
                    var metadata = typeof (data) === "string" ? JSON.parse(data) : data;
                    metadataStore.importMetadata(metadata);
                } catch(e) {
                    var errMsg = "Unable to either parse or import metadata: " + e.message;
                    return handleHttpError(deferred, httpResponse, "Metadata query failed for: " + url + ". " + errMsg);
                }

                // import may have brought in the service.
                if (!metadataStore.hasMetadataFor(serviceName)) {
                    metadataStore.addDataService(dataService);
                }

                deferred.resolve(metadata);
                
            },
            error: function (httpResponse) {
                handleHttpError(deferred, httpResponse, "Metadata query failed for: " + url);
            }
        });
        return deferred.promise;
    };

    ctor.prototype.executeQuery = function (mappingContext) {

        var deferred = Q.defer();
        var url = mappingContext.getUrl();

        var that = this;
        var params = {
            type: "GET",
            url: url,
            params: mappingContext.query.parameters,
            dataType: 'json',
            success: function (httpResponse) {
                var data = httpResponse.data;
                try {
                    var rData;
                    if (data && data.Results) {
                        rData = { results: data.Results, inlineCount: data.InlineCount, httpResponse: httpResponse };
                    } else {
                        rData = { results: data, httpResponse: httpResponse };
                    }
                    
                    deferred.resolve(rData);
                } catch (e) {
                    if (e instanceof Error) {
                        deferred.reject(e);
                    } else {
                        handleHttpError(httpResponse)
                    }
                }

            },
            error: function(httpResponse) {
                handleHttpError(deferred, httpResponse);
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
            type: "POST",
            url: url,
            dataType: 'json',
            contentType: "application/json",
            data: bundle,
            success: function (httpResponse) {
                var data = httpResponse.data;
                httpResponse.saveContext = saveContext;
                var entityErrors = data.Errors || data.errors;
                if (entityErrors) {
                    handleHttpError(deferred, httpResponse);
                } else {
                    var saveResult = that._prepareSaveResult(saveContext, data);
                    deferred.resolve(saveResult);
                }
                
            },
            error: function (httpResponse) {
                httpResponse.saveContext = saveContext;
                handleHttpError(deferred, httpResponse);
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
   
    function handleHttpError(deferred, httpResponse, messagePrefix) {
        var err = createHttpError(httpResponse);
        if (messagePrefix) {
            err.message = messagePrefix + "; " + err.message;
        }
        return deferred.reject(err);
    };

    function createHttpError(httpResponse) {
        var err = new Error();
        err.httpResponse = httpResponse;
        err.status = httpResponse.status;
        var errObj = httpResponse.data;
        // some ajax providers will convert errant result into an object ( angular), others will not (jQuery)
        // if not do it here.
        if (typeof errObj === "string") {
            try {
                errObj = JSON.parse(errObj);
            } catch (e) { };
        }
        
        if (errObj) {
            var entityErrors = errObj.EntityErrors || errObj.entityErrors || errObj.Errors || errObj.errors;
            if (entityErrors && httpResponse.saveContext) {
                processEntityErrors(err, entityErrors, httpResponse.saveContext);
            } else {
                err.message = extractInnerMessage(errObj)
            }
        } else {
            err.message = httpResponse.error && httpResponse.error.toString();
        }
        
        return err;
    };

    function extractInnerMessage(errObj) {
        while (errObj.InnerException) {
            errObj = errObj.InnerException;
        }
        return errObj.ExceptionMessage || errObj.Message || errObj.toString();
    }

    function processEntityErrors(err, entityErrors, saveContext) {
        err.message = "Server side errors encountered - see the entityErrors collection on this object for more detail";
        var propNameFn = saveContext.entityManager.metadataStore.namingConvention.serverPropertyNameToClient;
        err.entityErrors = entityErrors.map(function (e) {
            return {
                errorName: e.ErrorName,
                entityTypeName: MetadataStore.normalizeTypeName(e.EntityTypeName),
                keyValues: e.KeyValues,
                propertyName: e.PropertyName && propNameFn(e.PropertyName),
                errorMessage: e.ErrorMessage
            };
        });

    }
    
    return ctor;

})();
