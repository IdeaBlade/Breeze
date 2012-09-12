// also needs OData
define(["core", "entityMetadata"], 
function (core, m_entityMetadata) {
 
    var EntityType = m_entityMetadata.EntityType;

    var remoteAccess_odata = {};
    // -------------------------------------------
    
    OData.jsonHandler.recognizeDates = true;

    remoteAccess_odata.getEntityTypeName = function (rawEntity) {
        return EntityType._getNormalizedTypeName(rawEntity.__metadata.type);
    };

    remoteAccess_odata.executeQuery = function (entityManager, odataQuery, entityCallback, collectionCallback, errorCallback) {
        var metadataStore = entityManager.metadataStore;
        var url = entityManager.serviceName + odataQuery;
        OData.read(url,
            function (data, response) {
                var entities = core.using(entityManager, "isLoading", true, function () {
                    // TODO: check response object here for possible errors.
                    return data.results.map(function (rawEntity) {
                        return entityCallback(rawEntity);
                    });
                });
                collectionCallback({ results: entities });
            },
            function (error) {
                if (errorCallback) errorCallback(createError(error));
            });
    };



    remoteAccess_odata.getDeferredValue = function (rawEntity) {
        return rawEntity['__deferred'];
    };

    remoteAccess_odata.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['__deferred'];
        if (id) {
            return null;
        } else {
            return undefined;
        }
    };

    remoteAccess_odata.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
        var metadataSvcUrl = getMetadataUrl(serviceName);
        OData.read(metadataSvcUrl,
            function (data) {
                // data.dataServices.schema is an array of schemas. with properties of 
                // entityContainer[], association[], entityType[], and namespace.
                if (!data || !data.dataServices) {
                    var error = new Error("No schema found for: " + metadataSvcUrl);
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
            },
            function (error) {
                if (errorCallback) errorCallback(createError(error));
            },
            OData.metadataHandler
        );

    };

    remoteAccess_odata.saveChanges = function(entityManager, saveBundleStringified, callback, errorCallback) {
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


    return remoteAccess_odata;

});
