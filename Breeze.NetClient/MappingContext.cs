using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class MappingContext {

    private EntityQuery _query;
    private DataService _dataService;
    private EntityManager _entityManager;
    private MergeStrategy _mergeStrategy;

    private Dictionary<String, IStructuralObject> _refMap = new Dictionary<string,IStructuralObject>();
    private List<Action> _deferredFns = new List<Action>();
    private JsonResultsAdapter JsonResultsAdapter {
      get; private set; 
    }
    public MetadataStore MetadataStore {
      get; private set; 
    }
    //      this.rawValueFn = DataProperty.getRawValueFromServer; // think about passing this in later.
  
  //  proto.getUrl = function () {
  //      return  this.dataService.makeUrl(this.metadataStore.toQueryString(this.query));
  //  }

    // return a collection of 
    public List<Object> VisitAndMerge(JArray nodes, Dictionary<String, Object> nodeContext = null) {
  
      nodeContext = nodeContext ?? new Dictionary<String, Object>() ;
      return nodes.Select(node => {
        if (_query == null && node is IEntity) {
          var entity = (IEntity) node;
          // don't bother merging a result from a save that was not returned from the server.
          if (entity.EntityAspect.EntityState.IsDeleted()) {
              _entityManager.DetachEntity(entity);
          } else {
              entity.EntityAspect.AcceptChanges();
          }
          return entity;
        }
        var meta = this.JsonResultsAdapter.VisitNode(node, nodeContext);
        var newNode = meta.Node ?? node;
        if (_query != null && nodeContext.nodeType == "root" && meta.EntityType == null) {
          meta.EntityType = _query.GetToEntityType();
        }
        ProcessMeta(newNode, meta);
      }).ToList();
  
  //      return __map(nodes, function (node) {
  
            
  //          var meta = jra.visitNode(node, that, nodeContext) || {};
  //          node = meta.node || node;
  //          if (query && nodeContext.nodeType === "root" && !meta.entityType) {
  //              meta.entityType = query._getToEntityType && query._getToEntityType(that.metadataStore);
  //          }
  //          return processMeta(that, node, meta);
  //      });
  };

  //  proto.processDeferred = function () {
  //      if (this.deferredFns.length > 0) {
  //          this.deferredFns.forEach(function (fn) {
  //              fn();
  //          });
  //      }
  //  }

  //  function processMeta(mc, node, meta, assignFn) {
  //      // == is deliberate here instead of ===
  //      if (meta.ignore || node == null) {
  //          return null;
  //      } else if (meta.nodeRefId) {
  //          var refValue = resolveEntityRef(mc, meta.nodeRefId);
  //          if (typeof refValue === "function" && assignFn != null) {
  //              mc.deferredFns.push(function () {
  //                  assignFn(refValue);
  //              });
  //              return undefined; // deferred and will be set later;
  //          }
  //          return refValue;
  //      } else if (meta.entityType) {
  //          var entityType = meta.entityType;
  //          if (mc.mergeOptions.noTracking) {
  //              node = processNoMerge(mc, entityType, node);
  //              if (entityType.noTrackingFn) {
  //                  node = entityType.noTrackingFn(node, entityType);
  //              } 
  //              if (meta.nodeId) {
  //                  mc.refMap[meta.nodeId] = node;
  //              }
  //              return node;
  //          } else {
  //              if (entityType.isComplexType) {
  //                  // because we still need to do serverName to client name processing
  //                  return processNoMerge(mc, entityType, node);
  //              } else {
  //                  return mergeEntity(mc, node, meta);
  //              }
  //          }
  //      } else {
  //          if (typeof node === 'object' && !__isDate(node)) {
  //              node = processAnonType(mc, node);
  //          }

  //          // updating the refMap for entities is handled by updateEntityRef for entities.
  //          if (meta.nodeId) {
  //              mc.refMap[meta.nodeId] = node;
  //          }
  //          return node;
  //      }
  //  }

  //  function processNoMerge(mc, stype, node) {
  //      var result = {};

  //      stype.dataProperties.forEach(function (dp) {
  //          if (dp.isComplexProperty) {
  //              result[dp.name] = __map(node[dp.nameOnServer], function (v) {
  //                  return processNoMerge(mc, dp.dataType, v);
  //              });
  //          } else {
  //              result[dp.name] = parseRawValue(node[dp.nameOnServer], dp.dataType);
  //          }
  //      });

  //      stype.navigationProperties && stype.navigationProperties.forEach(function (np) {
  //          var nodeContext = { nodeType: "navProp", navigationProperty: np };
  //          visitNode(node[np.nameOnServer], mc, nodeContext, result, np.name);
  //      });

  //      return result;
  //  }

  //  function processAnonType(mc, node) {
  //      // node is guaranteed to be an object by this point, i.e. not a scalar          
  //      var keyFn = mc.metadataStore.namingConvention.serverPropertyNameToClient;
  //      var result = {};

  //      __objectForEach(node, function (key, value) {
  //          var newKey = keyFn(key);
  //          var nodeContext = { nodeType: "anonProp", propertyName: newKey };
  //          visitNode(value, mc, nodeContext, result, newKey);
  //      });
  //      return result;
  //  }

  //  function visitNode(node, mc, nodeContext, result, key) {
  //      var jra = mc.jsonResultsAdapter;
  //      var meta = jra.visitNode(node, mc, nodeContext) || {};
  //      // allows visitNode to change the value;
  //      node = meta.node || node;

  //      if (meta.ignore) return;

  //      if (Array.isArray(node)) {
  //          nodeContext.nodeType = nodeContext.nodeType + "Item";
  //          result[key] = node.map(function (v, ix) {
  //              meta = jra.visitNode(v, mc, nodeContext) || {};
  //              v = meta.node || v;
  //              return processMeta(mc, v, meta, function (refValue) {
  //                  result[key][ix] = refValue();
  //              });
  //          });
  //      } else {
  //          result[key] = processMeta(mc, node, meta, function (refValue) {
  //              result[key] = refValue();
  //          });
  //      }
  //  }

  //  function resolveEntityRef(mc, nodeRefId) {
  //      var entity = mc.refMap[nodeRefId];
  //      if (entity === undefined) {
  //          return function () { return mc.refMap[nodeRefId]; };
  //      } else {
  //          return entity;
  //      }
  //  }

  //  function updateEntityRef(mc, targetEntity, node) {
  //      var nodeId = node._$meta.nodeId;
  //      if (nodeId != null) {
  //          mc.refMap[nodeId] = targetEntity;
  //      }
  //  }

  //  function mergeEntity(mc, node, meta) {
  //      node._$meta = meta;
  //      var em = mc.entityManager;
        
  //      var entityType = meta.entityType;
  //      if (typeof (entityType) === 'string') {
  //          entityType = mc.metadataStore._getEntityType(entityType, false);
  //      }
  //      node.entityType = entityType;

  //      var mergeStrategy = mc.mergeOptions.mergeStrategy;
  //      var isSaving = mc.query == null;

  //      var entityKey = entityType.getEntityKeyFromRawEntity(node, mc.rawValueFn);
  //      var targetEntity = em.findEntityByKey(entityKey);
  //      if (targetEntity) {
  //          if (isSaving && targetEntity.entityAspect.entityState.isDeleted()) {
  //              em.detachEntity(targetEntity);
  //              return targetEntity;
  //          }
  //          var targetEntityState = targetEntity.entityAspect.entityState;
  //          if (mergeStrategy === MergeStrategy.Disallowed) {
  //              throw new Error("A MergeStrategy of 'Disallowed' prevents " + entityKey.toString() + " from being merged");
  //          } else if (mergeStrategy === MergeStrategy.SkipMerge) {
  //              updateEntityNoMerge(mc, targetEntity, node);
  //          } else {
  //              if (mergeStrategy === MergeStrategy.OverwriteChanges
  //                      || targetEntityState.isUnchanged()) {
  //                  updateEntity(mc, targetEntity, node);
  //                  targetEntity.entityAspect.wasLoaded = true;
  //                  if (meta.extra) {
  //                      targetEntity.entityAspect.extraMetadata = meta.extra;
  //                  }
  //                  targetEntity.entityAspect.entityState = EntityState.Unchanged;
  //                  targetEntity.entityAspect.originalValues = {};
  //                  targetEntity.entityAspect.propertyChanged.publish({ entity: targetEntity, propertyName: null });
  //                  var action = isSaving ? EntityAction.MergeOnSave : EntityAction.MergeOnQuery;
  //                  em.entityChanged.publish({ entityAction: action, entity: targetEntity });
  //                  // this is needed to handle an overwrite of a modified entity with an unchanged entity 
  //                  // which might in turn cause _hasChanges to change.
  //                  if (!targetEntityState.isUnchanged) {
  //                      em._notifyStateChange(targetEntity, false);
  //                  }
  //              } else {
  //                  updateEntityNoMerge(mc, targetEntity, node);
  //              }
  //          }
  //      } else {
  //          targetEntity = entityType._createInstanceCore();
          
  //          updateEntity(mc, targetEntity, node);
            
  //          if (meta.extra) {
  //              targetEntity.entityAspect.extraMetadata = meta.extra;
  //          }
  //          em._attachEntityCore(targetEntity, EntityState.Unchanged, MergeStrategy.Disallowed);
  //          targetEntity.entityAspect.wasLoaded = true;
  //          em.entityChanged.publish({ entityAction: EntityAction.AttachOnQuery, entity: targetEntity });
  //      }
  //      return targetEntity;
  //  }

  //  function updateEntityNoMerge(mc, targetEntity, node) {
  //      updateEntityRef(mc, targetEntity, node);
  //      // we still need to merge related entities even if top level entity wasn't modified.
  //      node.entityType.navigationProperties.forEach(function (np) {
  //          if (np.isScalar) {
  //              mergeRelatedEntityCore(mc, node, np);
  //          } else {
  //              mergeRelatedEntitiesCore(mc, node, np);
  //          }
  //      });
  //  }

  //  function updateEntity(mc, targetEntity, node) {
  //      updateEntityRef(mc, targetEntity, node);
  //      var entityType = targetEntity.entityType;
  //      entityType._updateTargetFromRaw(targetEntity, node, mc.rawValueFn);
        
  //      entityType.navigationProperties.forEach(function (np) {
  //          if (np.isScalar) {
  //              mergeRelatedEntity(mc, np, targetEntity, node);
  //          } else {
  //              mergeRelatedEntities(mc, np, targetEntity, node);
  //          }
  //      });
  //  }

  //  function mergeRelatedEntity(mc, navigationProperty, targetEntity, rawEntity) {

  //      var relatedEntity = mergeRelatedEntityCore(mc, rawEntity, navigationProperty);
  //      if (relatedEntity == null) return;
  //      if (typeof relatedEntity === 'function') {
  //          mc.deferredFns.push(function () {
  //              relatedEntity = relatedEntity();
  //              updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
  //          });
  //      } else {
  //          updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
  //      }
  //  }

  //  function mergeRelatedEntities(mc, navigationProperty, targetEntity, rawEntity) {
  //      var relatedEntities = mergeRelatedEntitiesCore(mc, rawEntity, navigationProperty);
  //      if (relatedEntities == null) return;
  //      // Uncomment when we implement entityAspect.isNavigationPropertyLoaded method
  //      // targetEntity.entityAspect.markNavigationPropertyAsLoaded(navigationProperty);
  //      var inverseProperty = navigationProperty.inverse;
  //      if (!inverseProperty) return;

  //      var originalRelatedEntities = targetEntity.getProperty(navigationProperty.name);
  //      originalRelatedEntities.wasLoaded = true;
        
  //      relatedEntities.forEach(function (relatedEntity) {
  //          if (typeof relatedEntity === 'function') {
  //              mc.deferredFns.push(function () {
  //                  relatedEntity = relatedEntity();
  //                  updateRelatedEntityInCollection(relatedEntity, originalRelatedEntities, targetEntity, inverseProperty);
  //              });
  //          } else {
  //              updateRelatedEntityInCollection(relatedEntity, originalRelatedEntities, targetEntity, inverseProperty);
  //          }
  //      });
  //  }

  //  function mergeRelatedEntityCore(mc, rawEntity, navigationProperty) {
  //      var relatedRawEntity = rawEntity[navigationProperty.nameOnServer];
  //      if (!relatedRawEntity) return null;

  //      var relatedEntity = mc.visitAndMerge(relatedRawEntity, { nodeType: "navProp", navigationProperty: navigationProperty });
  //      return relatedEntity;
  //  }

  //  function mergeRelatedEntitiesCore(mc, rawEntity, navigationProperty) {
  //      var relatedRawEntities = rawEntity[navigationProperty.nameOnServer];
  //      if (!relatedRawEntities) return null;

  //      // needed if what is returned is not an array and we expect one - this happens with __deferred in OData.
  //      if (!Array.isArray(relatedRawEntities)) {
  //          // return null;
  //          relatedRawEntities = relatedRawEntities.results; // OData v3 will look like this with an expand
  //          if (!relatedRawEntities) {
  //              return null;
  //          }
  //      }
        
  //      var relatedEntities = mc.visitAndMerge(relatedRawEntities, { nodeType: "navPropItem", navigationProperty: navigationProperty });
  //      return relatedEntities;
  //  }

  //  function updateRelatedEntity(relatedEntity, targetEntity, navigationProperty) {
  //      if (!relatedEntity) return;
  //      var propName = navigationProperty.name;
  //      var currentRelatedEntity = targetEntity.getProperty(propName);

  //      // Uncomment when we implement entityAspect.isNavigationPropertyLoaded method
  //      // targetEntity.entityAspect.markNavigationPropertyAsLoaded(navigationProperty);

  //      // check if the related entity is already hooked up
  //      if (currentRelatedEntity !== relatedEntity) {
  //          // if not hook up both directions.
  //          targetEntity.setProperty(propName, relatedEntity);
  //          var inverseProperty = navigationProperty.inverse;
  //          if (!inverseProperty) return;
  //          if (inverseProperty.isScalar) {
  //              relatedEntity.setProperty(inverseProperty.name, targetEntity);

  //              // Uncomment when we implement entityAspect.isNavigationPropertyLoaded method
  //              // relatedEntity.entityAspect.markNavigationPropertyAsLoaded(inverseProperty);
  //          } else {
  //              var collection = relatedEntity.getProperty(inverseProperty.name);
  //              collection.push(targetEntity);
  //              // can't call _markAsLoaded here because this may be only a partial load.
  //          }
  //      }
  //  } 

  //  function updateRelatedEntityInCollection(relatedEntity, relatedEntities, targetEntity, inverseProperty) {
  //      if (!relatedEntity) return;
  //      // Uncomment when we implement entityAspect.isNavigationPropertyLoaded method
  //      // relatedEntity.entityAspect.markNavigationPropertyAsLoaded(inverseProperty);
  //      // check if the related entity is already hooked up
  //      var thisEntity = relatedEntity.getProperty(inverseProperty.name);
  //      if (thisEntity !== targetEntity) {
  //          // if not - hook it up.
  //          relatedEntities.push(relatedEntity);
  //          relatedEntity.setProperty(inverseProperty.name, targetEntity);
  //      }
  //  }
     
  //}
}

}
