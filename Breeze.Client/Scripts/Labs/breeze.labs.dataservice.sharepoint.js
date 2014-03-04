/*
 * Breeze Labs SharePoint 2013 OData DataServiceAdapter
 *
 *  v.0.2.3
 *
 * Registers a SharePoint 2013 OData DataServiceAdapter with Breeze
 * 
 * REQUIRES breeze.labs.dataservice.rest.js
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
 * This adapter has its own JsonResultsAdapter which you could replace.
 * 
 * The dataservice adapter looks for clientTypeNameToServer and serverTypeNameToClient methods
 * on the JsonResultsAdapter during transformation of entity data to/from the server
 * so it can convert server type names to client EntityType names.
 * These are initialized to the default versions defined here. 
 * You can create and attach alternative type name conversion methods to the JsonResultsAdapter
 * 
 * This adapter memoizes the type names it encounters 
 * by adding a 'typeMap' object to the JsonResultsAdapter.
 *
 * By default this adapter permits multiple entities to be saved at a time,
 * each in a separate request that this adapter fires off in parallel. 
 * and waits for all to complete.
 * 
 * If 'saveOnlyOne' == true, the adapter throws an exception
 * when asked to save more than one entity at a time.
 * 
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Authors: Ward Bell, Andrew Connell
 */
(function (definition, window) {
    if (window.breeze) {
        definition(window.breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node
        var b = require('breeze');
        definition(b);
    } else if (typeof define === "function" && define["amd"] && !window.breeze) {
        // Requirejs / AMD 
        define(['breeze'], definition);
    } else {
        throw new Error("Can't find breeze");
    }
}(function (breeze) {
    "use strict";

    var ctor = function () {
        this.name = "SharePointOData";
    };
    ctor.prototype.initialize = typeInitialize;

    function typeInitialize() {
        // Delay setting the prototype until we're sure AbstractRestDataServiceAdapter is loaded
        var fn = breeze.AbstractRestDataServiceAdapter.prototype;
        fn = breeze.core.extend(ctor.prototype, fn);
        fn.executeQuery = executeQuery;
        fn._addToSaveContext = _addToSaveContext;
        fn._createErrorFromResponse = _createErrorFromResponse;
        fn._createJsonResultsAdapter = _createJsonResultsAdapter;
        fn._createSaveRequest = _createSaveRequest;
        fn._getResponseData = _getResponseData;
        fn._processSavedEntity = _processSavedEntity;

        this.initialize(); // the revised initialize()
    }

    breeze.config.registerAdapter("dataService", ctor);

    function _addToSaveContext(saveContext) {
        saveContext.requestDigest = this.getRequestDigest ? this.getRequestDigest() : null;
    }

    function applyDefaultSelect(mappingContext) {
        var query = mappingContext.query;
        var entityType = mappingContext.entityType;

        // get the default select if query lacks a select and 
        // the result type is known and it has a defaultSelect
        var defaultSelect = !query.selectClause && entityType &&
            entityType.custom && entityType.custom.defaultSelect;
        if (defaultSelect) {
            // revise query with a new query that has the default select
            mappingContext.query = query.select(defaultSelect);
        }
    }

    function clientTypeNameToServerDefault(clientTypeName) {
        return 'SP.Data.' + clientTypeName + 'sListItem';
    }

    function _createErrorFromResponse(response, url) {
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

    function _createJsonResultsAdapter() {

        var dataServiceAdapter = this;
        var jsonResultsAdapter = new breeze.JsonResultsAdapter({
            name: dataServiceAdapter.name + "_default",
            visitNode: visitNode
        });

        jsonResultsAdapter.clientTypeNameToServer = clientTypeNameToServerDefault;
        jsonResultsAdapter.serverTypeNameToClient = serverTypeNameToClientDefault;

        return jsonResultsAdapter;

        function visitNode(node, mappingContext, nodeContext) {
            var result = { ignore: true };
            if (!node) { return result; }

            var propertyName = nodeContext.propertyName;
            var ignore = node.__deferred != null || propertyName === "__metadata" ||
                // EntityKey properties can be produced by EDMX models
                (propertyName === "EntityKey" && node.$type && core.stringStartsWith(node.$type, "System.Data"));

            if (!ignore) {
                result = {};
                updateEntityNode(node, mappingContext, result);

                // OData v3 - projection arrays will be enclosed in a results array
                if (node.results) {
                    result.node = node.results;
                }
            }
            return result;
        }

        // Determine if this is an Entity node and update the node appropriately if so
        function updateEntityNode(node, mappingContext, result) {
            var metadata = node.__metadata;
            if (!metadata) { return; }

            var typeName = dataServiceAdapter._serverTypeNameToClient(mappingContext, metadata.type);
            var entityType = dataServiceAdapter._getNodeEntityType(mappingContext, typeName);

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
                    navPropNames.forEach(function (n) { if (node[n]) { delete node[n]; } });
                }
            }
        }
    }

    function _createSaveRequest(saveContext, entity, index) {
        var adapter = saveContext.adapter;
        var data, rawEntity, request;
        var entityManager = saveContext.entityManager;
        var helper = entityManager.helper;
        var tempKeys = saveContext.tempKeys;

        var aspect = entity.entityAspect;
        var state = aspect.entityState;
        var type = entity.entityType;
        var headers = {
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json;odata=verbose',
            'DataServiceVersion': '2.0', // or get MIME type error
            'X-RequestDigest': saveContext.requestDigest
        };

        if (state.isAdded()) {
            var rn = type.defaultResourceName;
            if (!rn) {
                throw new Error("Missing defaultResourceName for type " + type.name);
            }
            if (type.autoGeneratedKeyType !== breeze.AutoGeneratedKeyType.None) {
                tempKeys[index] = aspect.getKey(); // DO NOT PUSH. Gaps expected!
            }

            rawEntity = helper.unwrapInstance(entity, adapter._transformSaveValue);
            rawEntity.__metadata = {
                'type': adapter._clientTypeNameToServer(type.shortName)
            };

            data = adapter._serializeToJson(rawEntity);
            request = {
                requestUri: entityManager.dataService.serviceName + rn,
                method: "POST",
                data: data
            };

        } else if (state.isModified()) {
            rawEntity = helper.unwrapChangedValues(
                entity, entityManager.metadataStore, adapter._transformSaveValue);
            rawEntity.__metadata = { 'type': aspect.extraMetadata.type };
            data = adapter._serializeToJson(rawEntity);
            headers['X-HTTP-Method'] = 'MERGE';
            request = {
                method: "POST",
                data: data
            };
            adjustUpdateDeleteRequest();

        } else if (state.isDeleted()) {
            request = {
                method: "DELETE",
                data: null
            };
            adjustUpdateDeleteRequest();
        } else {
            throw new Error("Cannot save an entity whose EntityState is " + state.name);
        }

        request.headers = headers;

        return request;

        function adjustUpdateDeleteRequest() {
            var extraMetadata = aspect.extraMetadata;
            if (!extraMetadata) {
                throw new Error("Missing the extra metadata for an update/delete entity");
            }
            var uri = extraMetadata.uri || extraMetadata.id;
            request.requestUri = uri;
            if (extraMetadata.etag) {
                headers["If-Match"] = extraMetadata.etag;
            }
            return request;
        }
    }

    function executeQuery(mappingContext) {
        var adapter = this;
        mappingContext.entityType = adapter._getEntityTypeFromMappingContext(mappingContext);
        applyDefaultSelect(mappingContext);
        var deferred = adapter.Q.defer();
        var url = mappingContext.getUrl();
        var headers = {
            'Accept': 'application/json;odata=verbose',
            'DataServiceVersion': '2.0', // seems to work w/o this but just in case
        };

        adapter._ajaxImpl.ajax({
            type: "GET",
            url: url,
            headers: headers,
            params: mappingContext.query.parameters,
            success: querySuccess,
            error: function (response) {
                deferred.reject(adapter._createErrorFromResponse(response, url));
            }
        });
        return deferred.promise;

        function querySuccess(response) {
            try {
                var data = response.data;
                var inlineCount = data.__count ? parseInt(data.__count, 10) : undefined;
                var rData = {
                    results: adapter._getResponseData(response).results,
                    inlineCount: inlineCount,
                    httpResponse: response
                };
                deferred.resolve(rData);
            } catch (e) {
                // program error means adapter it broken, not SP or the user
                deferred.reject(new Error("Program error: failed while parsing successful query response"));
            }
        }
    }

    function _getResponseData(response) {
        return response.data && response.data.d; // sharepoint adds a 'd' !?!
    }

    function _processSavedEntity(savedEntity, saveContext, response /*, index*/) {
        var etag = savedEntity && savedEntity.entityAspect && response.getHeaders('ETag');
        if (etag) {
            savedEntity.entityAspect.extraMetadata.etag = etag;
        }
    }

    function serverTypeNameToClientDefault(serverTypeName) {
        // strip off leading 'SP.Data.' and trailing 'sListItem'
        var re = /^(SP\.Data.)(.*)(sListItem)$/;
        var typeName = serverTypeName.replace(re, '$2');

        return breeze.MetadataStore.normalizeTypeName(typeName);
    }

}, this));