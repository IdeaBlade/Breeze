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
    
    var OData;
    
    var ctor = function () {
    };

    ctor.prototype.name = "OData";

    ctor.prototype.initialize = function () {
        OData = window.OData;
        if (!OData) {
            throw new Error("Breeze needs the OData library to support remote OData services and was unable to initialize OData.");
        }
        OData.jsonHandler.recognizeDates = true;
    };
    
    // will return null if anon
    ctor.prototype.getEntityType = function (rawEntity, metadataStore) {
        // TODO: may be able to make this more efficient by caching of the previous value.
        var entityTypeName = EntityType._getNormalizedTypeName(rawEntity.__metadata.type);
        var entityType = entityTypeName && metadataStore.getEntityType(entityTypeName, true);
        var isFullEntity = entityType && entityType._mappedPropertiesCount === Object.keys(rawEntity).length - 1;
        return isFullEntity ? entityType : null;
    };


    ctor.prototype.executeQuery = function (entityManager, odataQuery, collectionCallback, errorCallback) {
        var url = entityManager.serviceName + odataQuery;
        OData.read(url,
            function (data, response) {
                collectionCallback( data.results);
            },
            function (error) {
                if (errorCallback) errorCallback(createError(error));
            }
        );
    };
    
 
    ctor.prototype.getDeferredValue = function (rawEntity) {
        return rawEntity['__deferred'];
    };

    ctor.prototype.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['__deferred'];
        if (id) {
            return null;
        } else {
            return undefined;
        }
    };

    ctor.prototype.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
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
                metadataStore._parseODataMetadata(serviceName, schema);
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

    core.config.registerInterface("remoteAccess", ctor);

}));
