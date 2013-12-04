(function (factory) {
    if (breeze) {
        factory(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    }
}(function(breeze) {
    
    var core = breeze.core;
 
    var MetadataStore = breeze.MetadataStore;
    var JsonResultsAdapter = breeze.JsonResultsAdapter;
    var DataProperty = breeze.DataProperty;
    
    var OData;
    
    var ctor = function () {
        this.name = "OData";

    };

    ctor.prototype.initialize = function () {
        OData = core.requireLib("OData", "Needed to support remote OData services");
        OData.jsonHandler.recognizeDates = true;
    };
    
    
    ctor.prototype.executeQuery = function (mappingContext) {
    
        var deferred = Q.defer();
        var url = mappingContext.getUrl();
        
        OData.read({
                requestUri: url,
                headers: { "DataServiceVersion": "2.0" }
            },
            function (data, response) {
                var inlineCount;
                if (data.__count) {
                    // OData can return data.__count as a string
                    inlineCount = parseInt(data.__count, 10);
                }
                return deferred.resolve({ results: data.results, inlineCount: inlineCount });
            },
            function (error) {
                return deferred.reject(createError(error, url));
            }
        );
        return deferred.promise;
    };
    

    ctor.prototype.fetchMetadata = function (metadataStore, dataService) {

        var deferred = Q.defer();

        var serviceName = dataService.serviceName;
        var url = dataService.makeUrl('$metadata');
        
        //OData.read({
        //    requestUri: url,
        //    headers: {
        //        "Accept": "application/json",
        //    }
        //},
        OData.read(url,
            function (data) {
                // data.dataServices.schema is an array of schemas. with properties of 
                // entityContainer[], association[], entityType[], and namespace.
                if (!data || !data.dataServices) {
                    var error = new Error("Metadata query failed for: " + url);
                    return deferred.reject(error);
                }
                var csdlMetadata = data.dataServices;

                // might have been fetched by another query
                if (!metadataStore.hasMetadataFor(serviceName)) {
                    try {
                        metadataStore.importMetadata(csdlMetadata);
                    } catch(e) {
                        return deferred.reject(new Error("Metadata query failed for " + url + "; Unable to process returned metadata: " + e.message));
                    }

                    metadataStore.addDataService(dataService);
                }

                return deferred.resolve(csdlMetadata);

            }, function (error) {
                var err = createError(error, url);
                err.message = "Metadata query failed for: " + url + "; " + (err.message || "");
                return deferred.reject(err);
            },
            OData.metadataHandler
        );

        return deferred.promise;

    };

    ctor.prototype.saveChanges = function (saveContext, saveBundle) {

        var deferred = Q.defer();

        var helper = saveContext.entityManager.helper;
        var url = saveContext.dataService.makeUrl("$batch");
        
        var requestData = createChangeRequests(saveContext, saveBundle);
        var tempKeys = saveContext.tempKeys;
        var contentKeys = saveContext.contentKeys;
        var that = this;
        OData.request({
            headers : { "DataServiceVersion": "2.0" } ,
            requestUri: url,
            method: "POST",
            data: requestData
        }, function (data, response) {
            var entities = [];
            var keyMappings = [];
            var saveResult = { entities: entities, keyMappings: keyMappings };
            data.__batchResponses.forEach(function(br) {
                br.__changeResponses.forEach(function (cr) {
                    var response = cr.response || cr;
                    var statusCode = response.statusCode;
                    if ((!statusCode) || statusCode >= 400) {
                        return deferred.reject(createError(cr, url));
                    }
                    
                    var contentId = cr.headers["Content-ID"];
                    
                    var rawEntity = cr.data;
                    if (rawEntity) {
                        var tempKey = tempKeys[contentId];
                        if (tempKey) {
                            var entityType = tempKey.entityType;
                            if (entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                                var tempValue = tempKey.values[0];
                                var realKey = entityType.getEntityKeyFromRawEntity(rawEntity, DataProperty.getRawValueFromServer);
                                var keyMapping = { entityTypeName: entityType.name, tempValue: tempValue, realValue: realKey.values[0] };
                                keyMappings.push(keyMapping);
                            }
                        }
                        entities.push(rawEntity);
                    } else {
                        var origEntity = contentKeys[contentId];
                        entities.push(origEntity);
                    }
                });
            });
            return deferred.resolve(saveResult);
        }, function (err) {
            return deferred.reject(createError(err, url));
        }, OData.batchHandler);

        return deferred.promise;

    };
 
    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter({
        name: "OData_default",

        visitNode: function (node, mappingContext, nodeContext) {
            var result = {};
            if (node == null) return result;
            if (node.__metadata != null) {
                // TODO: may be able to make this more efficient by caching of the previous value.
                var entityTypeName = MetadataStore.normalizeTypeName(node.__metadata.type);
                var et = entityTypeName && mappingContext.entityManager.metadataStore.getEntityType(entityTypeName, true);
                // if (et && et._mappedPropertiesCount === Object.keys(node).length - 1) {
                if (et && et._mappedPropertiesCount <= Object.keys(node).length - 1) {
                    result.entityType = et;
                    result.extra = node.__metadata;
                }
            }
            // OData v3 - projection arrays will be enclosed in a results array
            if (node.results) {
                result.node = node.results;
            }

            var propertyName = nodeContext.propertyName;
            result.ignore = node.__deferred != null || propertyName === "__metadata" ||
                // EntityKey properties can be produced by EDMX models
                (propertyName === "EntityKey" && node.$type && core.stringStartsWith(node.$type, "System.Data"));
            return result;
        }
        
    });

    function transformValue(prop, val ) {
        if (prop.isUnmapped) return undefined;
        if (prop.dataType === DataType.DateTimeOffset) {
            // The datajs lib tries to treat client dateTimes that are defined as DateTimeOffset on the server differently
            // from other dateTimes. This fix compensates before the save.
            val = val && new Date(val.getTime() - (val.getTimezoneOffset() * 60000));
        } else if (prop.dataType.quoteJsonOData) {
            val = val != null ? val.toString() : val;
        }
        return val;
    }

    function createChangeRequests(saveContext, saveBundle) {
        var changeRequests = [];
        var tempKeys = [];
        var contentKeys = [];
        var prefix = saveContext.dataService.serviceName;
        var entityManager = saveContext.entityManager;
        var helper = entityManager.helper;
        var id = 0;
        saveBundle.entities.forEach(function (entity) {
            var aspect = entity.entityAspect;
            id = id + 1; // we are deliberately skipping id=0 because Content-ID = 0 seems to be ignored.
            var request = { headers: { "Content-ID": id, "DataServiceVersion": "2.0" } };
            contentKeys[id] = entity;
            if (aspect.entityState.isAdded()) {
                request.requestUri = prefix + entity.entityType.defaultResourceName;
                request.method = "POST";
                request.data = helper.unwrapInstance(entity, transformValue);
                tempKeys[id] = aspect.getKey();
            } else if (aspect.entityState.isModified()) {
                updateDeleteMergeRequest(request, aspect, prefix);
                request.method = "MERGE";
                request.data = helper.unwrapChangedValues(entity, entityManager.metadataStore, transformValue);
                // should be a PATCH/MERGE
            } else if (aspect.entityState.isDeleted()) {
                updateDeleteMergeRequest(request, aspect, prefix);
                request.method = "DELETE";
            } else {
                return;
            }
            changeRequests.push(request);
        });
        saveContext.contentKeys = contentKeys;
        saveContext.tempKeys = tempKeys;
        return {
            __batchRequests: [{
                __changeRequests: changeRequests
            }]
        };

    }

    function updateDeleteMergeRequest(request, aspect, prefix) {
        var extraMetadata = aspect.extraMetadata;
        var uri = extraMetadata.uri || extraMetadata.id;
        request.requestUri = uri;
        if (extraMetadata.etag) {
            request.headers["If-Match"] = extraMetadata.etag;
        }
    }
   
    function createError(error, url) {
        // OData errors can have the message buried very deeply - and nonobviously
        // this code is tricky so be careful changing the response.body parsing.
        var result = new Error();
        var response = error.response;
        result.message = response.statusText;
        result.statusText = response.statusText;
        result.status = response.statusCode;
        // non std
        if (url) result.url = url;
        result.body = response.body;
        if (response.body) {
            var nextErr;
            try {
                var body = JSON.parse(response.body);
                result.body = body;
                // OData v3 logic
                if (body['odata.error']) {
                    body = body['odata.error'];
                }
                var msg = "";
                do {
                    nextErr = body.error || body.innererror;
                    if (!nextErr) msg = msg + getMessage(body);
                    nextErr = nextErr || body.internalexception;
                    body = nextErr || body;
                } while (nextErr);
                if (msg.length > 0) {
                    result.message = msg;
                }
            } catch (e) {

            }
        }
        return result;
    }

    function getMessage(body) {
        var msg = body.message || "";
        return ((typeof (msg) === "string") ? msg : msg.value) + "; ";
    }

    breeze.config.registerAdapter("dataService", ctor);

}));

