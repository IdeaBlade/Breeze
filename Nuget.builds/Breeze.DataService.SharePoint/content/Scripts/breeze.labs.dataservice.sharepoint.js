/*
 * Breeze Labs SharePoint 2013 OData DataServiceAdapter
 *
 *  v.0.1.3-pre
 *
 * Registers a SharePoint 2013 OData DataServiceAdapter with Breeze
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
(function(factory) {
    if (breeze) {
        factory(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    }
})(function(breeze) {

    var core = breeze.core;
    var OData;

    var adapterName = "SharePointOData";
    var ctor = function() {
        this.name = adapterName;
    };

    ctor.prototype = {
        constructor: ctor,
        executeQuery: executeQuery,
        fetchMetadata: fetchMetadata,
        getRequestDigest: undefined, // function that returns value for X-RequestDigest header
        initialize: initialize,
        jsonResultsAdapter: createJsonResultsAdapter(),
        Q: Q, // assume Q.js in global namespace; you better set it if it's not there
        saveChanges: saveChanges,
        saveOnlyOne: true, // false if you allow multiple entity saves; beware!
    };

    breeze.config.registerAdapter("dataService", ctor);

    /*** Implementation ***/

    function initialize() {
        OData = core.requireLib("OData", "Needed to support remote OData services");
        OData.jsonHandler.recognizeDates = true;
    };

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

        function getMessage() {
            var m = body.message || "";
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
            var request;
            originalEntities.push(entity);

            var aspect = entity.entityAspect;
            var state = aspect.entityState;
            var type = entity.entityType;
            var headers = {
                'DataServiceVersion': "2.0", // Why?
                'Accept': 'application/json;odata=verbose;',
                'Content-Type': 'application/json;odata=verbose;',
                'X-RequestDigest': saveContext.requestDigest
            };

            if (state.isAdded()) {
                var rn = type.defaultResourceName;
                if (!rn) {
                    throw new Error("Missing defaultResourceName for type " + type.name);
                }
                request = {
                    requestUri: entityManager.dataService.serviceName + rn,
                    method: "POST",
                    data: helper.unwrapInstance(entity, transformValue)
                };
                request.data['__metadata'] = {
                    'type': saveContext.clientTypeNameToServer(type.shortName)
                };
                tempKeys[index] = aspect.getKey(); // DO NOT PUSH. Gaps expected!

            } else if (state.isModified()) {
                var data = helper.unwrapChangedValues(entity, entityManager.metadataStore, transformValue);
                data.__metadata = { 'type': aspect.extraMetadata.type };
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
                if (prop.isUnmapped) return undefined;
                if (prop.dataType === breeze.DataType.DateTimeOffset) {
                    // The datajs lib tries to treat client dateTimes that are defined as DateTimeOffset on the server differently
                    // from other dateTimes. This fix compensates before the save.
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

        var deferred = this.Q.defer();
        var url = mappingContext.getUrl();
        var headers = {
            'DataServiceVersion': '2.0', // Why?
            'Accept': 'application/json;odata=verbose',
        };

        OData.read({
                requestUri: url,
                headers: headers
            },
            function(data) {
                var inlineCount = data.__count ? parseInt(data.__count, 10) : undefined;
                return deferred.resolve({ results: data.results, inlineCount: inlineCount });
            },
            function(error) {
                return deferred.reject(createError(error, url));
            }
        );
        return deferred.promise;
    };

    function fetchMetadata() {
        throw new Error("Cannot process SharePoint metadata; create your own and use that instead");
    };

    function getClientTypeNameToServer(dataServiceAdapter) {
        var jrAdapter = dataServiceAdapter.jsonResultsAdapter;
        return jrAdapter.clientTypeNameToServer ?
            function(typeName) { return jrAdapter.clientTypeNameToServer(typeName); } :
            defaultClientTypeNameToServer;
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
                .then(saveSucceeded)
                .then(null, saveFailed)

        } catch (err) {
            return Q.reject(err);
        }

        function saveSucceeded(promiseValues) {
            return saveContext.saveResult; 
        }

        function saveFailed(error) {
            var requestCount = comboPromise.length;
            if (requestCount < 2) {
                // Only one request so failure is probably no big deal
                return Q.reject(error);
            }
            // Multiple requests => serious trouble.
            var saveResult = saveContext.saveResult;
            var savedCount = saveResult.entities.length;
            var emsg = "At least one of the " + requestCount + " save requests failed " +
                "with the message '"+ (error.message ? error.message : error) +"'.";
            emsg += (savedCount ? "At least "+ savedCount : "No");
            emsg += " requests are known to have succeeded on the server, perhaps more. " +
            "Regardless, the EntityManager cache is in an unstable state. ;"

            var newErr = new Error(emsg);
            newErr.originalError = error;
            // Attaching the 'saveContext' for diagnostic purposes but
            // it is unlikely that there is any truly safe recovery and
            // we recommend, at a minimum, that you call manager.rejectChanges()
            // and reload pertinent entity data from the server.
            newErr.failedSaveContext = saveContext;
            return Q.reject(newErr);
        }
    };

    function sendSaveRequests(saveContext, requests) {
        // Sends each prepared save request and processes the promised results
        // returns a single "comboPromise" that waits for the individual promises to complete
        // Todo: What happens when there are a gazillion async requests?
        var Q = saveContext.Q;
        var savedEntities = [];
        var keyMappings = [];
        var saveResult = { entities: savedEntities, keyMappings: keyMappings };
        saveContext.saveResult = saveResult;

        return requests.map(sendSaveRequest);

        function sendSaveRequest(request, index) {
            var deferred = Q.defer();

            OData.request({
                    requestUri: request.requestUri,
                    method: request.method,
                    headers: request.headers,
                    data: request.data
                },
                requestSucceeded,
                requestFailed);

            return deferred.promise;

            function requestSucceeded(data, response) {
                var statusCode = response.statusCode;
                if ((!statusCode) || statusCode >= 400) {
                    return deferred.reject(createError(response, url));
                }

                var rawEntity = response.data;
                if (rawEntity) {
                    var tempKey = saveContext.tempKeys[index];
                    if (tempKey) {
                        var entityType = tempKey.entityType;
                        if (entityType.autoGeneratedKeyType !== breeze.AutoGeneratedKeyType.None) {
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
                    var etag = response.headers['ETag'];
                    if (etag) {
                        saved.entityAspect.extraMetadata.etag = etag;
                    }
                    savedEntities.push(saved);
                }

                return deferred.resolve(true);
            }

            function requestFailed(err, url) {
                return deferred.reject(createError(err, url));
            }
        }
    }
});