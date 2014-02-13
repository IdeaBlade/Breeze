/*
 * Breeze Labs SharePoint 2013 OData DataServiceAdapter
 *
 *  v.0.1.0-pre
 *
 * Registers a SharePoint 2013 OData DataServiceAdapter with Breeze
 *
 * Typical usage in Angular
 *    // configure breeze to use SharePoint OData service
 *    var dsAdapter = breeze.config.initializeAdapterInstance('dataService', 'SharePointOData', true);
 *
 *    dsAdapter.setQ($q);   // if using $q for promises. 
 *    // dsAdapter.setQ(Q); // if using Q.js for promises.
 *
 *    dsAdapter.setSpContext(spContext); // spContext.securityValidation called for latest security key
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
        initialize: initialize,
        jsonResultsAdapter: createJsonResultsAdapter(),
        saveChanges: saveChanges,
        setQ: setQ,
        setSpContext: setSpContext,
    };

    breeze.config.registerAdapter("dataService", ctor);

    /*** Implementation ***/

    function initialize() {
        OData = core.requireLib("OData", "Needed to support remote OData services");
        OData.jsonHandler.recognizeDates = true;
    };

    function createJsonResultsAdapter() {

        var jsonResultsAdapter = new breeze.JsonResultsAdapter({
            name: adapterName + "_default",
            visitNode: createVisitNodeFn()
        });
        return jsonResultsAdapter;

        function createVisitNodeFn() {
            var dummyType = { _mappedPropertiesCount: NaN };
            var typeMap = {};

            return function(node, mappingContext, nodeContext) {
                var result = {};
                if (node == null) return result;
                updateEntityNode(node, mappingContext, result);

                // OData v3 - projection arrays will be enclosed in a results array
                if (node.results) {
                    result.node = node.results;
                }

                var propertyName = nodeContext.propertyName;
                result.ignore = node.__deferred != null || propertyName === "__metadata" ||
                    // EntityKey properties can be produced by EDMX models
                    (propertyName === "EntityKey" && node.$type && core.stringStartsWith(node.$type, "System.Data"));
                return result;
            };

            // Determine if this is an Entity node and update the node appropriately if so
            function updateEntityNode(node, mappingContext, result) {
                var typeName = '';
                var metadata = node.__metadata;
                if (!metadata) {
                    return;
                }

                var rawTypeName = metadata.type;
                var entityType = typeMap[rawTypeName]; // EntityType for a node with this metadata.type

                if (!entityType && rawTypeName) {
                    if (rawTypeName.substring(0, 7) === 'SP.Data') {
                        typeName = rawTypeName.substring(8).replace('sListItem', '');
                    }
                    // Haven't see this before; add it to the typeMap
                    typeName = breeze.MetadataStore.normalizeTypeName(typeName);
                    entityType = typeName && mappingContext.entityManager.metadataStore.getEntityType(typeName, true);
                    typeMap[rawTypeName] = entityType || dummyType; // dummy if null
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

    }

    function executeQuery(mappingContext) {

        var deferred = this.Q.defer();
        var url = mappingContext.getUrl();

        OData.read({
                requestUri: url,
                headers: {
                    'DataServiceVersion': '2.0', // Why?
                    'Accept': 'application/json;odata=verbose',
                    'X-RequestDigest': this.getSecurityValidation()
                }
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

    function saveChanges(saveContext, saveBundle) {
        if (saveBundle.entities.length > 1) {
            throw new Error("The SharePoint OData data service can only save one entity at a time.");
        }
        var entity = saveBundle.entities[0];

        saveContext.securityValidation = this.getSecurityValidation();

        var request = createSaveRequest(saveContext, entity);
        if (!request) {
            throw new Error("Could not compose valid save request.");
        }

        var deferred = this.Q.defer();

        OData.request({
            requestUri: request.requestUri,
            method: request.method,
            headers: request.headers,
            data: request.data 
        }, saveSucceeded, saveFailed);

        return deferred.promise;

        function saveSucceeded(data, response) {
            var entities = [];
            var keyMappings = [];
            var saveResult = { entities: entities, keyMappings: keyMappings };

            var statusCode = response.statusCode;
            if ((!statusCode) || statusCode >= 400) {
                return deferred.reject(createError(response, url));
            }

            var rawEntity = response.data;
            if (rawEntity) {
                var tempKey = saveContext.tempKey;
                if (tempKey) {
                    var entityType = tempKey.entityType;
                    if (entityType.autoGeneratedKeyType !== breeze.AutoGeneratedKeyType.None) {
                        var tempValue = tempKey.values[0];
                        var realKey = getEntityKeyFromRawEntity(entityType, rawEntity);
                        var keyMapping = {
                            entityTypeName: entityType.name,
                            tempValue: tempValue,
                            realValue: realKey.values[0]
                        };
                        keyMappings.push(keyMapping);
                    }
                }
                entities.push(rawEntity);
            } else {
                entities.push(saveContext.originalEntity);
            }

            return deferred.resolve(saveResult);
        }

        function saveFailed(err) {
            return deferred.reject(createError(err, url));
        }
    };

  function createSaveRequest(saveContext, entity) {
      var request;
      if (!entity) { return undefined; } // shouldn't be here

      saveContext.originalEntity = entity;

      var entityManager = saveContext.entityManager;
      var helper = entityManager.helper;

      var aspect = entity.entityAspect;
      var state = aspect.entityState;
      var type = entity.entityType;

      if (state.isAdded()) {
          var rn = type.defaultResourceName;
          if (!rn) {
              throw new Error("Missing defaultResourceName for type "+type.name);
          }
          request = {
              requestUri: entityManager.dataService.serviceName + rn,
              method: "POST",
              headers: {},
              data: helper.unwrapInstance(entity, transformValue)
          };
          request.data['__metadata'] = { 'type': 'SP.Data.' + type.shortName + 'sListItem' };
          saveContext.tempKey = aspect.getKey();
      } else if (state.isModified()) {
          var data = helper.unwrapChangedValues(entity, entityManager.metadataStore, transformValue);
          data.__metadata = { 'type': aspect.extraMetadata.type };
          request = {
              method: "POST",
              headers: { 'X-HTTP-Method': 'MERGE' },
              data: data
          };
          tweakUpdateDeleteMergeRequest();
          // should be a PATCH/MERGE
      } else if (state.isDeleted()) {
          request = {
              method: "DELETE",
              headers: {},
              data: null
          };
          tweakUpdateDeleteMergeRequest();
      } else {
          return undefined; // Huh? Detached? How did it get here?
      }

      var headers = request.headers;
      headers['DataServiceVersion'] = "2.0"; // Why?
      headers['Accept'] = 'application/json;odata=verbose;';
      headers['Content-Type'] = 'application/json;odata=verbose;';
      headers['X-RequestDigest'] = saveContext.securityValidation;

      return request;

      function tweakUpdateDeleteMergeRequest() {
          var extraMetadata = aspect.extraMetadata;
          if (!extraMetadata) {
              throw new Error("Missing the OData metadata for an update/delete entity");
          }
          var uri = extraMetadata.uri || extraMetadata.id;
          request.requestUri = uri;
          if (extraMetadata.etag) {
              request.headers["If-Match"] = extraMetadata.etag;
          }
          return request;
      }

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

    function getMessage() {
        var m = body.message || "";
        return ((typeof (m) === "string") ? m : m.value) + "; ";
    }
  }

  function getEntityKeyFromRawEntity(entityType, rawEntity) {
      return entityType.getEntityKeyFromRawEntity(
        rawEntity, breeze.DataProperty.getRawValueFromServer);
  }

  function setQ(qImpl) {
      this.Q = qImpl;
  }

  function setSpContext(context) {
      this.getSecurityValidation = function() { return context.securityValidation; };
  }
});