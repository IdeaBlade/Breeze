// also needs JQuery

define(["core", "entityMetadata"], 
function (core, m_entityMetadata) {

    var EntityType = m_entityMetadata.EntityType;   

    var remoteAccess_webApi = {};

    // -------------------------------------------

    remoteAccess_webApi.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
        var metadataSvcUrl = getMetadataUrl(serviceName);
        $.getJSON(metadataSvcUrl).done(function (data, textStatus, jqXHR) {
            var metadata = JSON.parse(data);
            if (!metadata) {
                if (errorCallback) errorCallback(new Error("No schema found for: " + metadataSvcUrl));
                return;
            }
            // setProperties metadataStore    
            // if from Edmx
            var schema = metadata.schema;
            if (!schema) {
                // if from DbContext 
                schema = metadata.conceptualModels.schema;
                if (!schema) {
                    if (errorCallback) errorCallback(new Error("Unable to locate 'schema' member in metadata"));
                    return;
                }
            }
            metadataStore._parseODataMetadata(serviceName, schema);
            if (callback) {
                callback(schema);
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            var err = createError(jqXHR);
            if (errorCallback) errorCallback(err);
        });
    };

    remoteAccess_webApi.executeQuery = function (entityManager, odataQuery, entityCallback, collectionCallback, errorCallback) {

        var url = entityManager.serviceName + odataQuery;
        $.getJSON(url).done(function (data, textStatus, jqXHR) {
            // TODO: check response object here for possible errors.
            var entities = core.using(entityManager, "isLoading", true, function () {
                return data.map(function (rawEntity) {
                    return entityCallback(rawEntity);
                });
            });
            collectionCallback({ results: entities });
        }).fail(function (jqXHR, textStatus, errorThrown) {
            if (errorCallback) errorCallback(createError(jqXHR));
        });
    };

    remoteAccess_webApi.saveChanges = function (entityManager, saveBundleStringified, callback, errorCallback) {
        var url = entityManager.serviceName + "SaveChanges";
        $.ajax(url, {
            type: "POST",
            contentType: "application/json",
            data: saveBundleStringified
        }).done(function (data, textStatus, jqXHR) {
            if (data.Error) {
                // anticipatable errors on server - concurrency...
                var err = createError(jqXHR);
                err.message = data.Error;
                errorCallback(err);
            } else {
                callback(data);
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            errorCallback(createError(jqXHR));
        });

    };

    remoteAccess_webApi.getEntityTypeName = function (rawEntity) {
        return EntityType._getNormalizedTypeName(rawEntity["$type"]);
    };

    remoteAccess_webApi.getDeferredValue = function (rawEntity) {
        // there are no deferred entries in the web api.
        return false;
    };

    remoteAccess_webApi.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['$ref'];
        if (id) {
            return queryContext.refMap[id];
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
        err.message = jqXHR.statusText;
        err.responseText = jqXHR.responseText;
        err.status = jqXHR.status;
        err.statusText = jqXHR.statusText;
        if (err.responseText) {
            try {
                var responseObj = JSON.parse(jqXHR.responseText);
                err.detail = responseObj;
                if (responseObj.InnerException) {
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

    return remoteAccess_webApi;


});
