/*
 * Breeze Labs SharePoint 2013 OData DataServiceAdapter
 *
 *  v.0.1.6-pre
 *
 * Registers a SharePoint 2013 OData DataServiceAdapter with Breeze
 * 
 * This adapter cannot get metadata from the server and in general one should
 * not do so because such metadata cover much more of than you want and are huge (>1MB)
 * Better to define the metadata "by hand" on the client.
 * 
 * W/o need to get metadata, can use AJAX adapter instead of Data.JS.
 *
 * Typical usage in Angular
 *    // configure breeze to use SharePoint OData service
 *    var dsAdapter = breeze.config.initializeAdapterInstance('dataService', 'SharePointOData', true);
 *
 *    // if using $q for promises ...
 *    dsAdapter.Q = $q; 
 *
 *    // provide method returning value for the SP OData 'X-RequestDigest' header
 *    dsAdapter.getRequestDigest = function(){return securityService.requestDigest}
 *
 * This adapter has its own JsonResultsAdapter which you could replace yourself
 * The adapter will look for clientTypeNameToServer and serverTypeNameToClient methods
 * on the JsonResultsAdapter so it can convert SP type names to client EntityType names.
 * If not found, it uses the default versions defined here. 
 * You can create your own type name conversion methods and attach them to the JsonResultsAdapter.
 * 
 * This adapter also memoizes the type names it encounters 
 * by adding a 'typeMap' object to the JsonResultsAdapter.
 *
 * By default this adapter permits only one entity to be saved at a time.
 * You can set 'adapter.saveOnlyOne' = false to allow more than one.
 * Beware: when a multi-entity save fails, the cache is likely in an incorrect 
 * and unstable state and the database data may be as well. You bear the risk.
 * 
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Authors: Ward Bell, Andrew Connell
 */
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
})(function (breeze) {

    var adapterName = "SharePointOData";
    var ajaxImpl;
    var core = breeze.core;
    var ctor = function () {
        this.name = adapterName;
    };

    ctor.prototype = {
        constructor: ctor,
        checkForRecomposition: checkForRecomposition,
        executeQuery: executeQuery,
        fetchMetadata: fetchMetadata,
        getRequestDigest: undefined, // function that returns value for X-RequestDigest header
        initialize: initialize,
        jsonResultsAdapter: createJsonResultsAdapter(),
        // Todo: use promise adapter after Breeze makes it available
        Q: window.Q, // assume Q.js in global namespace; you better set it (e.g., to $q) if it's not there, 
        saveChanges: saveChanges,
        saveOnlyOne: false, // false if you allow multiple entity saves.
        serializeToJson: serializeToJson // serialize raw entity data to JSON for save
    };

    breeze.config.registerAdapter("dataService", ctor);

    /*** Implementation ***/

    function initialize() {
        ajaxImpl = breeze.config.getAdapterInstance("ajax");

        if (!ajaxImpl) {
            throw new Error("Unable to initialize ajax for " + adapterName);
        }

        // don't cache 'ajax' because we then we would need to ".bind" it, and don't want to because of browser support issues. 
        var ajax = ajaxImpl.ajax;
        if (!ajax) {
            throw new Error("Breeze was unable to find an 'ajax' adapter for " + adapterName);
        }
    };

    function adjustQuery(mappingContext) {
        var query = mappingContext.query;
        var entityType = getEntityTypeFromQuery(mappingContext);

        // get the default select if query lacks a select and 
        // the result type is known and it has a defaultSelect
        var defaultSelect = !query.selectClause && entityType &&
            entityType.custom && entityType.custom.defaultSelect;
        if (defaultSelect) {
            // revise query with a new query that has the default select
            mappingContext.query = query.select(defaultSelect);
        }
    }

    function checkForRecomposition(interfaceInitializedArgs) {
        if (interfaceInitializedArgs.interfaceName === "ajax" && interfaceInitializedArgs.isDefault) {
            this.initialize();
        }
    };

    function createError(response, url) {
        // OData errors can have the message buried very deeply - and nonobviously
        // this code is tricky so be careful changing the response.body parsing.
        var result = new Error();
        result.response = response;
        if (url) { result.url = url; }
        result.message = response.message || response.error || response.statusText;
        result.statusText = response.statusText;
        result.status = response.status;

        var data = result.data = response.data;
        if (data) {
            var msg = "", nextErr;
            try {
                if (typeof (data) === "string") {
                    data = result.data = JSON.parse(data);
                }
                do {
                    nextErr = data.error || data.innererror;
                    if (!nextErr) { msg = msg + getMessage(data); }
                    nextErr = nextErr || data.internalexception;
                    data = nextErr;
                } while (nextErr);
                if (msg.length > 0) {
                    result.message = msg;
                }
            } catch (e) { /* carry on */ }
        }
        return result;

        function getMessage() {
            var m = data.message || "";
            return ((typeof (m) === "string") ? m : m.value) + "; ";
        }

    }

    function createJsonResultsAdapter() {

        var jsonResultsAdapter = new breeze.JsonResultsAdapter({
            name: adapterName + "_default",
            visitNode: visitNode
        });

        return jsonResultsAdapter;

        function visitNode(node, mappingContext, nodeContext) {

            var propertyName = nodeContext.propertyName;
            var ignore = node == null || node.__deferred != null || propertyName === "__metadata" ||
                // EntityKey properties can be produced by EDMX models
                (propertyName === "EntityKey" && node.$type && core.stringStartsWith(node.$type, "System.Data"));
            if (ignore) {
                return { ignore: true };
            } else {
                var result = {};
            }
            updateEntityNode(node, mappingContext, result);

            // OData v3 - projection arrays will be enclosed in a results array
            if (node.results) {
                result.node = node.results;
            }

            return result;
        };

        // Determine if this is an Entity node and update the node appropriately if so
        function updateEntityNode(node, mappingContext, result) {
            var metadata = node.__metadata;
            if (!metadata) {
                return;
            }

            var jrAdapter = mappingContext.jsonResultsAdapter;
            var typeMap = jrAdapter.typeMap;
            if (!typeMap) { // if missing, make one with a fallback mapping
                typeMap = { "": { _mappedPropertiesCount: NaN } };
                jrAdapter.typeMap = typeMap;
            }

            var rawTypeName = metadata.type;
            var entityType = typeMap[rawTypeName]; // EntityType for a node with this metadata.type

            if (!entityType && rawTypeName) {
                // Haven't see this rawTypeName before; add it to the typeMap
                // Figure out what EntityType this is and remember it

                var typeName = jrAdapter.serverTypeNameToClient ?
                    jrAdapter.serverTypeNameToClient(rawTypeName) :
                    defaultServerTypeNameToClient(rawTypeName);
                entityType = typeName && mappingContext.metadataStore.getEntityType(typeName, true);
                typeMap[rawTypeName] = entityType || typeMap[""];
            } 

            if (entityType) {
                // ASSUME if #-of-properties on node is <= #-of-props for the type 
                // that this is the full entity and not a partial projection. 
                // Therefore we declare that we've received an entity 
                if (entityType._mappedPropertiesCount <= Object.keys(node).length - 1) {
                    result.entityType = entityType;
                    result.extra = node.__metadata;

                    // Delete node properties that look like nested navigation paths
                    // Breeze gets confused into thinking such properties contain actual entities. 
                    // Todo: rethink this if/when can include related entities through expand
                    var navPropNames = entityType.navigationProperties.map(function (p) { return p.name; });
                    navPropNames.forEach(function(n) { if (node[n]) { delete node[n]; } });
                } 
            }
        }
    }

    function createSaveRequests(saveContext, saveBundle) {

        var entityManager = saveContext.entityManager;
        var helper = entityManager.helper;
        var requestDigest = saveContext.requestDigest;

        var originalEntities = saveContext.originalEntities = [];
        var tempKeys = saveContext.tempKeys = [];

        var requests = saveBundle.entities.map(createSaveRequest);
        return requests;

        function createSaveRequest(entity, index) {
            var data, rawData, request;
            originalEntities.push(entity);

            var aspect = entity.entityAspect;
            var state = aspect.entityState;
            var type = entity.entityType;
            var headers = {
                'Accept': 'application/json;odata=verbose',
                'DataServiceVersion': '2.0', // or get MIME type error
                'X-RequestDigest': saveContext.requestDigest
            };

            if (state.isAdded()) {
                var rn = type.defaultResourceName;
                if (!rn) {
                    throw new Error("Missing defaultResourceName for type " + type.name);
                }
                rawData = helper.unwrapInstance(entity, transformValue);
                rawData.__metadata = {
                    'type': saveContext.clientTypeNameToServer(type.shortName)
                };
                data = serializeToJson(rawData);
                request = {
                    requestUri: entityManager.dataService.serviceName + rn,
                    method: "POST",
                    data: data
                };

                tempKeys[index] = aspect.getKey(); // DO NOT PUSH. Gaps expected!

            } else if (state.isModified()) {
                rawData = helper.unwrapChangedValues(entity, entityManager.metadataStore, transformValue);
                rawData.__metadata = { 'type': aspect.extraMetadata.type };
                data = serializeToJson(rawData);
                headers['X-HTTP-Method'] = 'MERGE';
                request = {
                    method: "POST",
                    data: data
                };
                tweakUpdateDeleteMergeRequest();

            } else if (state.isDeleted()) {
                request = {
                    method: "DELETE",
                    data: null
                };
                tweakUpdateDeleteMergeRequest();
            } else {
                throw new Error("Cannot save an entity whose EntityState is " + state.name);
            }

            request.headers = headers;

            return request;

            function transformValue(prop, val) {
                if (prop.isUnmapped) { return undefined; }
                if (prop.dataType === breeze.DataType.DateTimeOffset) {
                    // The datajs lib tries to treat client dateTimes that are defined as DateTimeOffset on the server differently
                    // from other dateTimes. This fix compensates before the save.
                    // TODO: If not using datajs (and this adapter doesn't) is this necessary?
                    val = val && new Date(val.getTime() - (val.getTimezoneOffset() * 60000));
                } else if (prop.dataType.quoteJsonOData) {
                    val = val != null ? val.toString() : val;
                }
                return val;
            }

            function tweakUpdateDeleteMergeRequest() {
                var extraMetadata = aspect.extraMetadata;
                if (!extraMetadata) {
                    throw new Error("Missing the OData metadata for an update/delete entity");
                }
                var uri = extraMetadata.uri || extraMetadata.id;
                request.requestUri = uri;
                if (extraMetadata.etag) {
                    headers["If-Match"] = extraMetadata.etag;
                }
                return request;
            }
        }
    }

    function defaultClientTypeNameToServer(clientTypeName) {
        return 'SP.Data.' + clientTypeName + 'sListItem';
    }

    function defaultServerTypeNameToClient(serverTypeName) {
        // strip off leading 'SP.Data.' and trailing 'sListItem'
        var re = /^(SP\.Data.)(.*)(sListItem)$/;
        var typeName = serverTypeName.replace(re, '$2');
        return breeze.MetadataStore.normalizeTypeName(typeName);
    }

    function executeQuery(mappingContext) {
        adjustQuery(mappingContext);
        var deferred = this.Q.defer();
        var url = mappingContext.getUrl();
        var headers = {
            'Accept': 'application/json;odata=verbose',
            'DataServiceVersion': '2.0', // seems to work w/o this but just in case
        };

        ajaxImpl.ajax({
            type: "GET",
            url: url,
            headers: headers,
            success: querySuccess,
            error: function (response) {
                deferred.reject(createError(response, url));
            }
        });
        return deferred.promise;

        function querySuccess(response) {
            try {
                var data = response.data;
                var inlineCount = data.__count ? parseInt(data.__count, 10) : undefined;
                var rData = { results: data.d.results, inlineCount: inlineCount, httpResponse: response };
                deferred.resolve(rData);
            } catch (e) {
                // program error means adapter it broken, not SP or the user
                deferred.reject(new Error("Program error: failed while parsing successful query response"));
            }
        }
    }

    function fetchMetadata() {
        throw new Error("Cannot process SharePoint metadata; create your own and use that instead");
    };

    function getClientTypeNameToServer(dataServiceAdapter) {
        var jrAdapter = dataServiceAdapter.jsonResultsAdapter;
        return jrAdapter.clientTypeNameToServer ?
            function (typeName) { return jrAdapter.clientTypeNameToServer(typeName); } :
            defaultClientTypeNameToServer;
    }

    function getEntityTypeFromQuery(mappingContext) {
        var query = mappingContext.query;
        var entityType = query.entityType || query.resultEntityType;
        if (!entityType) { // try to figure it out from the query. resourceName
            var metadataStore = mappingContext.metadataStore;
            var etName = metadataStore.getEntityTypeNameForResourceName(query.resourceName);
            var entityType = metadataStore.getEntityType(etName);
        }
        return entityType
    }

    function saveChanges(saveContext, saveBundle) {
        var Q = this.Q;
        if (this.saveOnlyOne && saveBundle.entities.length > 1) {
            return Q.reject(new Error("Only one entity may be saved at a time."));
        }
        saveContext.clientTypeNameToServer = getClientTypeNameToServer(this);
        saveContext.Q = Q;
        saveContext.requestDigest = this.getRequestDigest ? this.getRequestDigest() : null;

        try {
            var requests = createSaveRequests(saveContext, saveBundle);
            var promises = sendSaveRequests(saveContext, requests);
            var comboPromise = Q.all(promises);
            // $q.all waits for all to complete, Q.all quits on first failure
            // It's bad regardless any of multiple save promises fail
            return comboPromise
                .then(reviewSaveResult)
                .then(null, saveFailed)

        } catch (err) {
            return Q.reject(err);
        }

        function reviewSaveResult(promiseValues) {
            var saveResult = saveContext.saveResult;
            return getSaveErrors(saveResult) || saveResult;

            function getSaveErrors() {
                var error;
                var entitiesWithErrors = saveResult.entitiesWithErrors;
                var errorCount = entitiesWithErrors.length;
                if (!errorCount) { return undefined; }

                // at least one request failed; process those that succeeded
                var savedEntities = saveContext.processSavedEntities(saveResult);

                // Compose error; promote the first error when one or all fail
                if (requests.length === 1 || requests.length === errorCount) {
                    // When all fail, good chance the first error is the same reason for all
                    error = entitiesWithErrors[0].error;
                } else {
                    error = new Error("\n The save failed although some entities were saved.");
                }
                error.message = (error.message || "Save failed") +
                    "  \n See 'error.saveResult' for more details.\n"
                error.saveResult = saveResult;
                return Q.reject(error);
            }
        }

        function saveFailed(error) {
            return Q.reject(error);
        }
    };

    function sendSaveRequests(saveContext, requests) {
        // Sends each prepared save request and processes the promised results
        // returns a single "comboPromise" that waits for the individual promises to complete
        // Todo: What happens when there are a gazillion async requests?
        var Q = saveContext.Q;
        var autoGenKeyTypeNone = breeze.AutoGeneratedKeyType.None;
        var savedEntities = [];
        var keyMappings = [];
        var entitiesWithErrors = [];
        var saveResult = {
            entities: savedEntities,
            entitiesWithErrors: entitiesWithErrors,
            keyMappings: keyMappings
        };
        saveContext.saveResult = saveResult;

        return requests.map(sendSaveRequest);

        function sendSaveRequest(request, index) {
            var deferred = Q.defer();
            var url = request.requestUri;
            ajaxImpl.ajax({
                url: url,
                type: request.method,
                headers: request.headers,
                data: request.data,
                contentType: 'application/json;odata=verbose',
                success: tryRequestSucceeded,
                error: requestFailed
            });

            return deferred.promise;

            function tryRequestSucceeded(response) {
                try {
                    requestSucceeded(response);
                } catch (e) {
                    // program error means adapter it broken, not SP or the user
                    deferred.reject("Program error: failed while processing successful save response");
                }
            }

            function requestSucceeded(response) {
                var statusCode = response.status;
                if ((!statusCode) || statusCode >= 400) {
                    return requestFailed(response);
                }

                var rawEntity = response.data && response.data.d; // sharepoint adds a 'd' !?!
                if (rawEntity) {
                    var tempKey = saveContext.tempKeys[index];
                    if (tempKey) {
                        var entityType = tempKey.entityType;
                        if (entityType.autoGeneratedKeyType !== autoGenKeyTypeNone) {
                            var tempValue = tempKey.values[0];
                            var realKey = entityType.getEntityKeyFromRawEntity(
                                rawEntity, breeze.DataProperty.getRawValueFromServer);
                            var keyMapping = {
                                entityTypeName: entityType.name,
                                tempValue: tempValue,
                                realValue: realKey.values[0]
                            };
                            keyMappings.push(keyMapping);
                        }
                    }
                    savedEntities.push(rawEntity);
                } else {
                    var saved = saveContext.originalEntities[index];
                    var etag = response.getHeaders('ETag');
                    if (etag) {
                        saved.entityAspect.extraMetadata.etag = etag;
                    }
                    savedEntities.push(saved);
                }

                return deferred.resolve(true);
            }

            function requestFailed(response) {
                try {
                    // Do NOT fail saveChanges at the request level
                    entitiesWithErrors.push({
                        entity: saveContext.originalEntities[index],
                        error: createError(response, url)
                    })
                    return deferred.resolve(false);
                } catch (e) {
                    // program error means adapter it broken, not SP or the user
                    return deferred.reject("Program error: failed while processing save error");
                }
            }
        }
    }

    function serializeToJson(rawEntityData) {
        // Serialize raw entity data to JSON during save
        // You could override this default version
        // Note that DataJS has an amazingly complex set of tricks for this, 
        // all of them depending on metadata attached to the property values 
        // which breeze entity data never have.
        return JSON.stringify(rawEntityData);
    }
});