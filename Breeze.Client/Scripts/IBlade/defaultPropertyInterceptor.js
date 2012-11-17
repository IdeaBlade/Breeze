
define(["core", "entityAspect"],
function (core, m_entityAspect) {

    var EntityKey = m_entityAspect.EntityKey;
    var EntityState = m_entityAspect.EntityState;
    var EntityAction = m_entityAspect.EntityAction;

    function defaultPropertyInterceptor(property, newValue, rawAccessorFn) {
        // 'this' is the entity itself in this context.

        var oldValue = rawAccessorFn();
        // exit if no change
        if (newValue === oldValue) {
            return;
        }
        var propName = property.name;

        // CANNOT DO NEXT LINE because it has the possibility of creating a new property
        // 'entityAspect' on 'this'.  - Not permitted by IE inside of a defined property on a prototype.
        // var aspect = new EntityAspect(this);

        var aspect = this.entityAspect;
        if (aspect._inProcess && aspect._inProcess === property) {
            // recursion avoided.
            return;
        }

        // TODO: we actually need to handle multiple properties in process. not just one
        // NOTE: this may not be needed because of the newValue === oldValue test above.
        // to avoid recursion.
        // We could use core.using here but decided not to for perf reasons - this method runs a lot.
        // i.e core.using(aspect, "_inProcess", property, function() {...
        aspect._inProcess = property;
        try {

            var entityManager = aspect.entityManager;
            // store an original value for this property if not already set
            if (aspect.entityState.isUnchangedOrModified()) {
                if (!aspect.originalValues[propName] && property.isDataProperty) {
                    // the || property.defaultValue is to insure that undefined -> null; 
                    // otherwise this entry will be skipped during serialization
                    aspect.originalValues[propName] = oldValue || property.defaultValue;
                }
            }

            // set the value
            if (property.isNavigationProperty) {
                if (!property.isScalar) {
                    throw new Error("Nonscalar navigation properties are readonly - entities can be added or removed but the collection may not be changed.");
                }

                var inverseProp = property.inverse;
                var oldSiblings;
                if (newValue) {
                    if (entityManager) {
                        if (newValue.entityAspect.entityState.isDetached()) {
                            entityManager.attachEntity(newValue, EntityState.Added);
                        } else {
                            if (newValue.entityAspect.entityManager !== entityManager) {
                                throw new Error("An Entity cannot be attached to an entity in another EntityManager. One of the two entities must be detached first.");
                            }
                        }
                    } else {
                        if (newValue.entityAspect && newValue.entityAspect.entityManager) {
                            entityManager = newValue.entityAspect.entityManager;
                            var newState = entityManager.isLoading ? EntityState.Unchanged : EntityState.Added;
                            entityManager.attachEntity(aspect.entity, newState);
                        }
                    }
                    
                    // process related updates ( the inverse relationship) first so that collection dups check works properly.
                    // update inverse relationship

                    if (inverseProp) {
                        if (inverseProp.isScalar) {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                // TODO: null -> NullEntity later
                                oldValue.setProperty(inverseProp.name, null);
                            }
                            newValue.setProperty(inverseProp.name, this);
                        } else {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                oldSiblings = oldValue.getProperty(inverseProp.name);
                                var ix = oldSiblings.indexOf(this);
                                if (ix !== -1) {
                                    oldSiblings.splice(ix, 1);
                                }
                            }
                            var siblings = newValue.getProperty(inverseProp.name);
                            // recursion check if already in the collection is performed by the relationArray
                            siblings.push(this);
                        }
                    }
                } else {
                     if (inverseProp) {
                        if (inverseProp.isScalar) {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                // TODO: null -> NullEntity later
                                oldValue.setProperty(inverseProp.name, null);
                            }
                        } else {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                oldSiblings = oldValue.getProperty(inverseProp.name);
                                var ix = oldSiblings.indexOf(this);
                                if (ix !== -1) {
                                    oldSiblings.splice(ix, 1);
                                }
                            }
                        }
                    }
                }

             
                rawAccessorFn(newValue);
                if (entityManager && !entityManager.isLoading) {
                    if (aspect.entityState.isUnchanged()) {
                        aspect.setModified();
                    }
                    if (entityManager.validationOptions.validateOnPropertyChange) {
                        aspect._validateProperty(property, newValue, { entity: this, oldValue: oldValue });
                    }
                }
                // update fk data property
                if (property.relatedDataProperties) {
                    if (!aspect.entityState.isDeleted()) {
                        var inverseKeyProps = property.entityType.keyProperties;
                        if (inverseKeyProps.length !== 1 && !newValue) {
                            throw new Error("Only single property foreign keys are currently supported.");
                        }
                        var keyProp = inverseKeyProps[0];
                        var relatedValue = newValue ? newValue.getProperty(keyProp.name) : keyProp.defaultValue;

                        this.setProperty(property.relatedDataProperties[0].name, relatedValue);
                    }
                }

            } else {
              
                // updating a dataProperty
                if (property.isPartOfKey && entityManager && !entityManager.isLoading) {
                    
                    var keyProps = this.entityType.keyProperties;
                    var values = keyProps.map(function(p) {
                        if (p == property) {
                            return newValue;
                        } else {
                            return this.getProperty(p.name);
                        }
                    }, this);
                    var newKey = new EntityKey(this.entityType, values);
                    if (entityManager.findEntityByKey(newKey)) {
                        throw new Error("An entity with this key is already in the cache: " + newKey.toString());
                    }
                    var oldKey = this.entityAspect.getKey();
                    var eg = entityManager.findEntityGroup(this.entityType);
                    eg._replaceKey(oldKey, newKey);
                }
                rawAccessorFn(newValue);
                  // NOTE: next few lines are the same as above but not refactored for perf reasons.
                if (entityManager && !entityManager.isLoading) {
                    if (aspect.entityState.isUnchanged()) {
                        aspect.setModified();
                    }
                    if (entityManager.validationOptions.validateOnPropertyChange) {
                        aspect._validateProperty(property, newValue, { entity: this, oldValue: oldValue });
                    }
                }
                // update corresponding nav property if attached.
                if (property.relatedNavigationProperty && entityManager) {
                    var relatedNavProp = property.relatedNavigationProperty;
                    if (newValue) {
                        var key = new EntityKey(relatedNavProp.entityType, [newValue]);
                        var relatedEntity = entityManager.findEntityByKey(key);

                        if (relatedEntity) {
                            this.setProperty(relatedNavProp.name, relatedEntity);
                        } else {
                            // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
                            entityManager._unattachedChildrenMap.addChild(key, relatedNavProp, this);
                        }
                    } else {
                        this.setProperty(relatedNavProp.name, null);
                    }
                }

                if (property.isPartOfKey) {
                    // propogate pk change to all related entities;
                    if (oldValue && !aspect.entityState.isDetached()) {
                        aspect.primaryKeyWasChanged = true;
                        
                    }
                    var that = this;
                    this.entityType.navigationProperties.forEach(function(np) {
                        var inverseNp = np.inverse;
                        if (!inverseNp) return;
                        if (inverseNp.foreignKeyNames.length === 0) return;
                        var npValue = that.getProperty(np.name);
                        var propertyIx = that.entityType.keyProperties.indexOf(property);
                        var fkName = inverseNp.foreignKeyNames[propertyIx];
                        if (np.isScalar) {
                            if (!npValue) return;
                            npValue.setProperty(fkName, newValue);

                        } else {
                            npValue.forEach(function(iv) {
                                iv.setProperty(fkName, newValue);
                            });
                        }
                    });
                    // insure that cached key is updated.
                    aspect.getKey(true);
                }
            }

            var propChangedArgs = { entity: this, propertyName: propName, oldValue: oldValue, newValue: newValue };
            if (entityManager) {
                // propertyChanged will be fired during loading but we only want to fire it once per entity, not once per property.
                // so propertyChanged is fired in the entityManager mergeEntity method if not fired here.
                if ( (!entityManager.isLoading) && (!entityManager.isRejectingChanges)) {
                    aspect.propertyChanged.publish(propChangedArgs);
                    // don't fire entityChanged event if propertyChanged is suppressed.
                    entityManager.entityChanged.publish({ entityAction: EntityAction.PropertyChange, entity: this, args: propChangedArgs });
                }
            } else {
                aspect.propertyChanged.publish(propChangedArgs);
            }
        } finally {
             aspect._inProcess = null;
        }
    }
    
    return defaultPropertyInterceptor;

});
