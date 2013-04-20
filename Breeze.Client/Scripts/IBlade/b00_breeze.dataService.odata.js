(function (factory) {
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
    
    var OData;
    
    var ctor = function () {
        this.name = "OData";
    };

    ctor.prototype.initialize = function () {
        OData = core.requireLib("OData", "Needed to support remote OData services");
        OData.jsonHandler.recognizeDates = true;
    };
    
    
    ctor.prototype.executeQuery = function (parseContext, collectionCallback, errorCallback) {
    
        OData.read(parseContext.url,
            function (data, response) {
                collectionCallback({ results: data.results, inlineCount: data.__count });
            },
            function (error) {
                if (errorCallback) errorCallback(createError(error));
            }
        );
    };
    

    ctor.prototype.fetchMetadata = function (metadataStore, dataService, callback, errorCallback) {
        var serviceName = dataService.serviceName;
        var url = dataService.makeUrl('$metadata');
        OData.read(url,
            function (data) {
                // data.dataServices.schema is an array of schemas. with properties of 
                // entityContainer[], association[], entityType[], and namespace.
                if (!data || !data.dataServices) {
                    var error = new Error("Metadata query failed for: " + url);
                    if (onError) {
                        onError(error);
                    } else {
                        callback(error);
                    }
                }
                var schema = data.dataServices.schema;

                // might have been fetched by another query
                if (!metadataStore.hasMetadataFor(serviceName)) {
                    metadataStore._parseODataMetadata(serviceName, schema);
                    metadataStore.addDataService(dataService);
                }

                if (callback) {
                    callback(schema);
                }
            }, function (error) {
                var err = createError(error);
                err.message = "Metadata query failed for: " + url + "; " + (err.message || "");
                if (errorCallback) errorCallback(err);
            },
            OData.metadataHandler
        );

    };

    ctor.prototype.saveChanges = function (saveContext, saveBundle, callback, errorCallback) {
        var helper = saveContext.entityManager.helper;
        var url = saveContext.dataService.makeUrl("$batch");
        
        var requestData = createChangeRequests(saveContext, saveBundle);
        var tempKeys = saveContext.tempKeys;
        var contentKeys = saveContext.contentKeys;
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
                        errorCallback(createError(cr));
                        return;
                    }
                    var contentId = cr.headers["Content-ID"];
                    if (contentId) {
                        var origEntity = contentKeys[contentId];
                    }
                    var rawEntity = cr.data;
                    if (rawEntity) {
                        var tempKey = tempKeys[contentId];
                        if (tempKey) {
                            var entityType = tempKey.entityType;
                            var tempValue = tempKey.values[0];
                            var realKey = helper.getEntityKeyFromRawEntity(rawEntity, entityType);
                            var keyMapping = { entityTypeName: entityType.name, tempValue: tempValue, realValue: realKey.values[0] };
                            keyMappings.push(keyMapping);
                        }
                        entities.push(rawEntity);
                    } else {
                        entities.push(origEntity);
                    }
                });
            });
            callback(saveResult);
        }, function (err) {
            errorCallback(createError(err));
        }, OData.batchHandler);

        // throw new Error("Breeze does not yet support saving thru OData");
    };


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
                request.requestUri = entity.entityType.defaultResourceName;
                request.method = "POST";
                request.data = helper.unwrapInstance(entity, true);
                tempKeys[id] = aspect.getKey();
            } else if (aspect.entityState.isModified()) {
                updateDeleteMergeRequest(request, aspect, prefix);
                request.method = "MERGE";
                request.data = helper.unwrapChangedValues(entity, entityManager.metadataStore, true);
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
        uri = extraMetadata.uri;
        if (__stringStartsWith(uri, prefix)) {
            uri = uri.substring(prefix.length);
        }
        request.requestUri = uri;
        if (extraMetadata.etag) {
            request.headers["If-Match"] = extraMetadata.etag;
        }
    }


    //function test() {
    //    var requestData1 = {
    //        __batchRequests: [{
    //            __changeRequests: [ {
    //                requestUri: "Customers", method: "POST", headers: { "Content-ID": "1"  }, data: { CustomerID: 400, CustomerName: "John" }
    //            }, {
    //                requestUri: "Orders", method: "POST", data: { OrderID: 400, Total: "99.99", Customer: { __metadata: { uri: "$1" } }  }
    //            }]
    //        }]
    //    };

    //    var requestData2 =  {
    //        __batchRequests: [{
    //            __changeRequests: [
    //              { requestUri: "BestMovies(0)", method: "PUT", data: { MovieTitle: 'Up' } },
    //              { requestUri: "BestMovies", method: "POST", data: { ID: 2, MovieTitle: 'Samurai' } }
    //            ]
    //        } ]
    //    };
    //};

    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter({
        name: "OData_default",

        visitNode: function (node, parseContext, nodeContext) {
            var result = {};

          if (node.__metadata != null) {
                // TODO: may be able to make this more efficient by caching of the previous value.
                var entityTypeName = MetadataStore.normalizeTypeName(node.__metadata.type);
                var et = entityTypeName && parseContext.entityManager.metadataStore.getEntityType(entityTypeName, true);
                if (et && et._mappedPropertiesCount === Object.keys(node).length - 1) {
                    result.entityType = et;
                    result.extra = node.__metadata;
                }
            }

            var propertyName = nodeContext.propertyName;
            result.ignore = node.__deferred != null || propertyName == "__metadata" ||
                // EntityKey properties can be produced by EDMX models
                (propertyName == "EntityKey" && node.$type && core.stringStartsWith(node.$type, "System.Data"));
            return result;
        },        
        
    });
   
    function createError(error) {
        var err = new Error();
        var response = error.response;
        err.message = response.statusText;
        err.statusText = response.statusText;
        err.status = response.statusCode;
        // non std
        err.body = response.body;
        err.requestUri = response.requestUri;
        if (response.body) {
            try {
                var error = JSON.parse(response.body);
                err.body = error;
                do {
                    var nextError = error.error || error.innererror;
                    error = nextError || error;
                } while (nextError)
                var msg = error.message;
                if (msg) {
                    err.message = (typeof (msg) == "string") ? msg : msg.value;
                }
            } catch (e) {

            }
        }
        return err;
    }

    breeze.config.registerAdapter("dataService", ctor);

}));
