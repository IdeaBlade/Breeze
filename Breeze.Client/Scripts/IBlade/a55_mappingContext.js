/**
@module breeze
**/

// Internal helper class

var MappingContext = (function () {
    
    var ctor = function(config) {      

        this.url = config.url;
        this.query = config.query;
        this.entityManager = config.entityManager
        this.dataService = config.dataService;
        this.queryOptions = config.queryOptions;

        this.refMap = {};
        this.deferredFns = [];
        this.jsonResultsAdapter = this.dataService.jsonResultsAdapter;
        
    };

    var proto = ctor.prototype;
    proto._$typeName = "MappingContext";

    proto.visitAndMerge = function (nodes, nodeContext) {
        var query = this.query;
        var jra = this.jsonResultsAdapter;
        nodeContext = nodeContext || {};
        var that = this;
        return nodes.map(function (node) {
            if (query == null && node.entityAspect) {
                // don't bother merging a result from a save that was not returned from the server.
                if (node.entityAspect.entityState.isDeleted()) {
                    that.entityManager.detachEntity(node);
                } else {
                    node.entityAspect.acceptChanges();
                }
                return node;
            }
            
            var meta = jra.visitNode(node, that, nodeContext) || {};
            node = meta.node || node;
            if (query && nodeContext.nodeType === "root" && !meta.entityType) {
                meta.entityType = query._getToEntityType && query._getToEntityType(that.entityManager.metadataStore);
            }
            return processMeta(that, node, meta);
        });
    };

    proto.processDeferred = function () {
        if (this.deferredFns.length > 0) {
            this.deferredFns.forEach(function (fn) {
                fn();
            });
        }
    }

    function processMeta(mc, node, meta, assignFn) {
        // == is deliberate here instead of ===
        if (meta.ignore || node == null) {
            return null;
        } else if (meta.nodeRefId) {
            var refValue = resolveRefEntity(mc, meta.nodeRefId);
            if (typeof refValue === "function" && assignFn != null) {
                mc.deferredFns.push(function () {
                    assignFn(refValue);
                });
                return undefined; // deferred and will be set later;
            }
            return refValue;
        } else if (meta.entityType) {
            if (meta.entityType.isComplexType) {
                return node;
            } else {
                return mergeEntity(mc, node, meta);
            }
        } else {
            // updating the refMap for entities is handled by updateEntityRef for entities.
            if (meta.nodeId) {
                mc.refMap[meta.nodeId] = node;
            }

            if (typeof node === 'object' && !__isDate(node)) {
                return processAnonType(mc, node);
            } else {
                return node;
            }
        }
    }

    function resolveRefEntity(mc, nodeRefId) {
        var entity = mc.refMap[nodeRefId];
        if (entity === undefined) {
            return function () { return mc.refMap[nodeRefId]; };
        } else {
            return entity;
        }
    }

    function mergeEntity(mc, node, meta) {
        node._$meta = meta;
        var em = mc.entityManager;
        
        var entityType = meta.entityType;
        if (typeof (entityType) === 'string') {
            entityType = em.metadataStore._getEntityType(entityType, false);
        }
        node.entityType = entityType;

        var mergeStrategy = mc.queryOptions.mergeStrategy;
        var isSaving = mc.query == null;


        var entityKey = entityType.getEntityKeyFromRawEntity(node, DataProperty.getRawValueFromServer);
        var targetEntity = em.findEntityByKey(entityKey);
        if (targetEntity) {
            if (isSaving && targetEntity.entityAspect.entityState.isDeleted()) {
                em.detachEntity(targetEntity);
                return targetEntity;
            }
            var targetEntityState = targetEntity.entityAspect.entityState;
            if (mergeStrategy === MergeStrategy.OverwriteChanges
                    || targetEntityState.isUnchanged()) {
                updateEntity(mc, targetEntity, node);
                targetEntity.entityAspect.wasLoaded = true;
                if (meta.extra) {
                    targetEntity.entityAspect.extraMetadata = meta.extra;
                }
                targetEntity.entityAspect.entityState = EntityState.Unchanged;
                targetEntity.entityAspect.originalValues = {};
                targetEntity.entityAspect.propertyChanged.publish({ entity: targetEntity, propertyName: null });
                var action = isSaving ? EntityAction.MergeOnSave : EntityAction.MergeOnQuery;
                em.entityChanged.publish({ entityAction: action, entity: targetEntity });
                // this is needed to handle an overwrite or a modified entity with an unchanged entity 
                // which might in turn cause _hasChanges to change.
                if (!targetEntityState.isUnchanged) {
                    em._notifyStateChange(targetEntity, false);
                }
            } else {
                updateEntityRef(mc, targetEntity, node);
                // we still need to merge related entities even if top level entity wasn't modified.
                entityType.navigationProperties.forEach(function (np) {
                    if (np.isScalar) {
                        mergeRelatedEntityCore(mc, node, np);
                    } else {
                        mergeRelatedEntitiesCore(mc, node, np);
                    }
                });
            }

        } else {
            targetEntity = entityType._createInstanceCore();
            if (targetEntity.initializeFrom) {
                // allows any injected post ctor activity to be performed by modelLibrary impl.
                targetEntity.initializeFrom(node);
            }
            updateEntity(mc, targetEntity, node);
            // entityType._initializeInstance(targetEntity);
            if (meta.extra) {
                targetEntity.entityAspect.extraMetadata = meta.extra;
            }
            em._attachEntityCore(targetEntity, EntityState.Unchanged);
            targetEntity.entityAspect.wasLoaded = true;
            em.entityChanged.publish({ entityAction: EntityAction.AttachOnQuery, entity: targetEntity });
        }
        return targetEntity;
    }

    function processAnonType(mc, node) {
        // node is guaranteed to be an object by this point, i.e. not a scalar          
        var em = mc.entityManager;
        var jra = mc.jsonResultsAdapter;
        var keyFn = em.metadataStore.namingConvention.serverPropertyNameToClient;
        var result = {};
        
        __objectForEach(node, function (key, value) {
            var meta = jra.visitNode(value, mc, { nodeType: "anonProp", propertyName: key }) || {};
            // allows visitNode to change the value;
            value = meta.node || value;

            if (meta.ignore) return;

            var newKey = keyFn(key);

            if (Array.isArray(value)) {
                result[newKey] = value.map(function (v, ix) {
                    meta = jra.visitNode(v, mc, { nodeType: "anonPropItem", propertyName: key }) || {};
                    return processMeta(mc, v, meta, function (refValue) {
                        result[newKey][ix] = refValue();
                    });
                });
            } else {
                result[newKey] = processMeta(mc, value, meta, function (refValue) {
                    result[newKey] = refValue();
                });
            }
        });
        return result;
    }

    function updateEntity(mc, targetEntity, rawEntity) {
        updateEntityRef(mc, targetEntity, rawEntity);
        var entityType = targetEntity.entityType;
        entityType._updateTargetFromRaw(targetEntity, rawEntity, DataProperty.getRawValueFromServer);
        
        entityType.navigationProperties.forEach(function (np) {
            if (np.isScalar) {
                mergeRelatedEntity(mc, np, targetEntity, rawEntity);
            } else {
                mergeRelatedEntities(mc, np, targetEntity, rawEntity);
            }
        });
    }

    function updateEntityRef(mc, targetEntity, rawEntity) {
        var nodeId = rawEntity._$meta.nodeId;
        if (nodeId != null) {
            mc.refMap[nodeId] = targetEntity;
        }
    }

    function mergeRelatedEntity(mc, navigationProperty, targetEntity, rawEntity) {

        var relatedEntity = mergeRelatedEntityCore(mc, rawEntity, navigationProperty);
        if (relatedEntity == null) return;
        if (typeof relatedEntity === 'function') {
            mc.deferredFns.push(function () {
                relatedEntity = relatedEntity();
                updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
            });
        } else {
            updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
        }
    }

    function mergeRelatedEntityCore(mc, rawEntity, navigationProperty) {
        var relatedRawEntity = rawEntity[navigationProperty.nameOnServer];
        if (!relatedRawEntity) return null;

        var relatedEntity = mc.visitAndMerge( [relatedRawEntity], { nodeType: "navProp", navigationProperty: navigationProperty });
        return relatedEntity[0];
    }

    function mergeRelatedEntities(mc, navigationProperty, targetEntity, rawEntity) {
        var relatedEntities = mergeRelatedEntitiesCore(mc, rawEntity, navigationProperty);
        if (relatedEntities == null) return;

        var inverseProperty = navigationProperty.inverse;
        if (!inverseProperty) return;
        var originalRelatedEntities = targetEntity.getProperty(navigationProperty.name);
        originalRelatedEntities.wasLoaded = true;
        
        relatedEntities.forEach(function (relatedEntity) {
            if (typeof relatedEntity === 'function') {
                mc.deferredFns.push(function () {
                    relatedEntity = relatedEntity();
                    updateRelatedEntityInCollection(relatedEntity, originalRelatedEntities, targetEntity, inverseProperty);
                });
            } else {
                updateRelatedEntityInCollection(relatedEntity, originalRelatedEntities, targetEntity, inverseProperty);
            }
        });
    }

    function mergeRelatedEntitiesCore(mc, rawEntity, navigationProperty) {
        var relatedRawEntities = rawEntity[navigationProperty.nameOnServer];
        if (!relatedRawEntities) return null;

        // needed if what is returned is not an array and we expect one - this happens with __deferred in OData.
        if (!Array.isArray(relatedRawEntities)) {
            // return null;
            relatedRawEntities = relatedRawEntities.results; // OData v3 will look like this with an expand
            if (!relatedRawEntities) {
                return null;
            }
        }
        
        var relatedEntities = mc.visitAndMerge(relatedRawEntities, { nodeType: "navPropItem", navigationProperty: navigationProperty });
        return relatedEntities;
    }

    function updateRelatedEntity(relatedEntity, targetEntity, navigationProperty) {
        if (!relatedEntity) return;
        var propName = navigationProperty.name;
        var currentRelatedEntity = targetEntity.getProperty(propName);
        // check if the related entity is already hooked up
        if (currentRelatedEntity !== relatedEntity) {
            // if not hook up both directions.
            targetEntity.setProperty(propName, relatedEntity);
            var inverseProperty = navigationProperty.inverse;
            if (!inverseProperty) return;
            if (inverseProperty.isScalar) {
                relatedEntity.setProperty(inverseProperty.name, targetEntity);
            } else {
                var collection = relatedEntity.getProperty(inverseProperty.name);
                collection.push(targetEntity);
            }
        }
    }
  

    function updateRelatedEntityInCollection(relatedEntity, relatedEntities, targetEntity, inverseProperty) {
        if (!relatedEntity) return;
        // check if the related entity is already hooked up
        var thisEntity = relatedEntity.getProperty(inverseProperty.name);
        if (thisEntity !== targetEntity) {
            // if not - hook it up.
            relatedEntities.push(relatedEntity);
            relatedEntity.setProperty(inverseProperty.name, targetEntity);
        }
    }
     
    
    return ctor;
})();
   


