(function (factory) {
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
    var JsonResultsAdapter = breeze.JsonResultsAdapter;
    
    var OData;
    
    var ctor = function () {
        this.name = "OData";
    };

    ctor.prototype.initialize = function () {
        OData = core.requireLib("OData", "Needed to support remote OData services");
        OData.jsonHandler.recognizeDates = true;
    };
    
    
    ctor.prototype.executeQuery = function (entityManager, odataQuery, collectionCallback, errorCallback) {
        var url = entityManager.serviceName + odataQuery;
        OData.read(url,
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
        var metadataSvcUrl = getMetadataUrl(serviceName);
        OData.read(metadataSvcUrl,
            function (data) {
                // data.dataServices.schema is an array of schemas. with properties of 
                // entityContainer[], association[], entityType[], and namespace.
                if (!data || !data.dataServices) {
                    var error = new Error("Metadata query failed for: " + metadataSvcUrl);
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
                err.message = "Metadata query failed for: " + metadataSvcUrl + "; " + (err.message || "");
                if (errorCallback) errorCallback(err);
            },
            OData.metadataHandler
        );

    };

    ctor.prototype.saveChanges = function (entityManager, saveBundleStringified, callback, errorCallback) {
        throw new Error("Breeze does not yet support saving thru OData");
    };
    
    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter({
        name: "OData_default",

        visitNode: function (value, queryContext, propertyName) {
            var result = {};
            
            if (value.__metadata != null) {
                // TODO: may be able to make this more efficient by caching of the previous value.
                var entityTypeName = EntityType._getNormalizedTypeName(value.__metadata.type);
                var et = entityTypeName && queryContext.entityManager.metadataStore.getEntityType(entityTypeName, true);
                if (et && et._mappedPropertiesCount === Object.keys(value).length - 1) {
                    result.entityType = et;
                }
            }
            result.ignore = value.__deferred != null || propertyName == "__metadata" ||
                // EntityKey properties can be produced by EDMX models
                (propertyName == "EntityKey" && value.$type && core.stringStartsWith(value.$type, "System.Data"));
            return result;
        },        
        
    });

    function getMetadataUrl(serviceName) {
        var metadataSvcUrl = serviceName;
        // remove any trailing "/"
        if (core.stringEndsWith(metadataSvcUrl, "/")) {
            metadataSvcUrl = metadataSvcUrl.substr(0, metadataSvcUrl.length - 1);
        }
        // ensure that it ends with /$metadata 
        if (!core.stringEndsWith(metadataSvcUrl, "/$metadata")) {
            metadataSvcUrl = metadataSvcUrl + "/$metadata";
        }
        return metadataSvcUrl;
    };

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
                var responseObj = JSON.parse(response.body);
                err.detail = responseObj;
                err.message = responseObj.error.message.value;
            } catch (e) {

            }
        }
        return err;
    }

    breeze.config.registerAdapter("dataService", ctor);

}));
